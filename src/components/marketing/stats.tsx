'use client';

const stats = [
  { value: '10K+', label: 'Total Domains' },
  { value: '50K+', label: 'Total Subdomain' },
  { value: '25K+', label: 'Total Tenant' },
  { value: '1M+', label: 'Total Product' },
];

export function Stats() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-lg text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
