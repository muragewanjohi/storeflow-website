import { prisma } from '@/lib/prisma/client';
import {
  createFormBuilderSchema,
  generateFormSlug,
  updateFormBuilderSchema,
} from '@/lib/forms/validation';
import type { z } from 'zod';

export class FormAdminError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'FormAdminError';
  }
}

export type ListFormsFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export type ListFormSubmissionsFilters = {
  page?: number;
  limit?: number;
};

export type CreateFormInput = z.infer<typeof createFormBuilderSchema>;
export type UpdateFormInput = z.infer<typeof updateFormBuilderSchema>;

export async function listForms(tenantId: string, filters: ListFormsFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    tenant_id: string;
    status?: string;
    OR?: Array<Record<string, unknown>>;
  } = {
    tenant_id: tenantId,
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const [forms, total] = await Promise.all([
    prisma.form_builders.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            form_submissions: true,
          },
        },
      },
    }),
    prisma.form_builders.count({ where }),
  ]);

  return {
    forms,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function createForm(tenantId: string, body: CreateFormInput) {
  const validatedData = createFormBuilderSchema.parse(body);
  const slug = validatedData.slug || generateFormSlug(validatedData.title);

  const existingForm = await prisma.form_builders.findFirst({
    where: {
      tenant_id: tenantId,
      slug,
    },
  });

  if (existingForm) {
    throw new FormAdminError('A form with this slug already exists', 409);
  }

  const form = await prisma.form_builders.create({
    data: {
      tenant_id: tenantId,
      title: validatedData.title,
      slug,
      description: validatedData.description || null,
      email: validatedData.email || null,
      button_text: validatedData.button_text || 'Submit',
      fields: validatedData.fields || [],
      success_message: validatedData.success_message || null,
      status: validatedData.status || 'active',
    },
  });

  return form;
}

export async function getForm(tenantId: string, formId: string) {
  const form = await prisma.form_builders.findFirst({
    where: {
      id: formId,
      tenant_id: tenantId,
    },
    include: {
      _count: {
        select: {
          form_submissions: true,
        },
      },
    },
  });

  if (!form) {
    throw new FormAdminError('Form not found', 404);
  }

  return form;
}

export async function updateForm(tenantId: string, formId: string, body: UpdateFormInput) {
  const validatedData = updateFormBuilderSchema.parse(body);

  const existingForm = await prisma.form_builders.findFirst({
    where: {
      id: formId,
      tenant_id: tenantId,
    },
  });

  if (!existingForm) {
    throw new FormAdminError('Form not found', 404);
  }

  let slug = validatedData.slug;
  if (validatedData.title && !slug) {
    slug = generateFormSlug(validatedData.title);
  } else if (!slug) {
    slug = existingForm.slug ?? undefined;
  }

  if (slug && slug !== existingForm.slug) {
    const slugExists = await prisma.form_builders.findFirst({
      where: {
        tenant_id: tenantId,
        slug,
        id: { not: formId },
      },
    });

    if (slugExists) {
      throw new FormAdminError('A form with this slug already exists', 409);
    }
  }

  const form = await prisma.form_builders.update({
    where: { id: formId },
    data: {
      title: validatedData.title,
      slug: slug || undefined,
      description: validatedData.description !== undefined ? validatedData.description : undefined,
      email: validatedData.email !== undefined ? validatedData.email : undefined,
      button_text: validatedData.button_text,
      fields: validatedData.fields,
      success_message:
        validatedData.success_message !== undefined ? validatedData.success_message : undefined,
      status: validatedData.status,
      updated_at: new Date(),
    },
  });

  return form;
}

export async function deleteForm(tenantId: string, formId: string) {
  const form = await prisma.form_builders.findFirst({
    where: {
      id: formId,
      tenant_id: tenantId,
    },
  });

  if (!form) {
    throw new FormAdminError('Form not found', 404);
  }

  await prisma.form_builders.delete({
    where: { id: formId },
  });
}

export async function listFormSubmissions(
  tenantId: string,
  formId: string,
  filters: ListFormSubmissionsFilters = {},
) {
  const form = await prisma.form_builders.findFirst({
    where: {
      id: formId,
      tenant_id: tenantId,
    },
  });

  if (!form) {
    throw new FormAdminError('Form not found', 404);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [submissions, total] = await Promise.all([
    prisma.form_submissions.findMany({
      where: {
        form_id: formId,
        tenant_id: tenantId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        data: true,
        ip_address: true,
        created_at: true,
      },
    }),
    prisma.form_submissions.count({
      where: {
        form_id: formId,
        tenant_id: tenantId,
      },
    }),
  ]);

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
