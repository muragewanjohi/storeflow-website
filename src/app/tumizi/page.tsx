import MarketingHeader from '@/components/marketing/header';
import { CheckCircle2, WalletCards, ShieldCheck, Receipt } from 'lucide-react';

export const metadata = {
  title: 'Tumizi Virtual Wallet | DukaNest',
  description:
    'Learn why Tumizi virtual wallet helps stores verify M-Pesa payments automatically, pay store expenses, and separate business money from personal money.',
};

const tumiziCharges = [
  { min: '1', max: '100', charge: '0' },
  { min: '101', max: '500', charge: '6' },
  { min: '501', max: '1,000', charge: '12' },
  { min: '1,001', max: '1,500', charge: '20' },
  { min: '1,501', max: '2,500', charge: '30' },
  { min: '2,501', max: '5,000', charge: '40' },
  { min: '5,001', max: '10,000', charge: '55' },
  { min: '10,001', max: '35,000', charge: '60' },
  { min: '35,001', max: '250,000', charge: '68' },
];

const mpesaCharges = [
  { min: '1', max: '49', charge: 'Free' },
  { min: '50', max: '100', charge: 'Free' },
  { min: '101', max: '500', charge: '7' },
  { min: '501', max: '1,000', charge: '13' },
  { min: '1,001', max: '1,500', charge: '23' },
  { min: '1,501', max: '2,500', charge: '33' },
  { min: '2,501', max: '3,500', charge: '53' },
  { min: '3,501', max: '5,000', charge: '57' },
  { min: '5,001', max: '7,500', charge: '78' },
  { min: '7,501', max: '10,000', charge: '90' },
  { min: '10,001', max: '15,000', charge: '100' },
  { min: '15,001', max: '20,000', charge: '105' },
  { min: '20,001', max: '35,000', charge: '108' },
  { min: '35,001', max: '50,000', charge: '108' },
  { min: '50,001', max: '250,000', charge: '108' },
];

export default function TumiziPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <MarketingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <section className="bg-white rounded-2xl border border-[#0025cc]/10 shadow-sm p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0025cc]/10 px-4 py-1.5 text-sm font-semibold text-[#0025cc]">
            <WalletCards className="h-4 w-4" />
            Why Tumizi Virtual Wallet
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-[#0c0528]">
            A business wallet built for faster and safer store operations
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-3xl">
            Tumizi virtual wallet helps your store collect M-Pesa payments with automatic
            verification, handle store expenses from the same wallet, and keep business money
            separate from your personal funds.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-lime-50 px-5 py-4 shadow-sm">
            <p className="text-sm sm:text-base font-semibold text-emerald-900">
              Withdraw any time, any amount to your M-Pesa.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Move money from your Tumizi wallet to your M-Pesa whenever you need it.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-[#0025cc]" />
              <h3 className="mt-2 font-semibold text-[#0c0528]">Automatic verification</h3>
              <p className="mt-1 text-sm text-slate-600">
                Customer checkout payments are confirmed automatically, reducing manual follow-up.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Receipt className="h-5 w-5 text-[#0025cc]" />
              <h3 className="mt-2 font-semibold text-[#0c0528]">Pay store expenses</h3>
              <p className="mt-1 text-sm text-slate-600">
                Use your wallet balance for store payouts and expense payments when needed.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-[#0025cc]" />
              <h3 className="mt-2 font-semibold text-[#0c0528]">Separate business money</h3>
              <p className="mt-1 text-sm text-slate-600">
                Keep store cashflows separate from personal money for cleaner operations, then
                withdraw to M-Pesa at any time in any amount.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0c0528]">
            M-Pesa vs Tumizi Virtual Wallet Charges
          </h2>
          <p className="mt-2 text-slate-600">
            Based on the charge tiers you shared. Amounts are in KES.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#0025cc]/20 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#0025cc] text-white px-5 py-4">
                <h3 className="text-lg font-semibold">Tumizi Virtual Wallet Charges</h3>
                <p className="text-sm text-blue-100">Lower fees across major payment bands</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Min</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Max</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tumiziCharges.map((row) => (
                      <tr key={`${row.min}-${row.max}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{row.min}</td>
                        <td className="px-4 py-3 text-slate-700">{row.max}</td>
                        <td className="px-4 py-3 font-semibold text-[#0025cc]">{row.charge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-300 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-200 bg-emerald-50">
                <span className="inline-flex items-center rounded-full bg-emerald-600 text-white text-xs font-bold px-3 py-1">
                  Safaricom
                </span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">M-Pesa Charges</h3>
                <p className="text-sm text-slate-600">
                  Official M-Pesa send money / transfer charge bands
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Min</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Max</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mpesaCharges.map((row) => (
                      <tr key={`${row.min}-${row.max}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{row.min}</td>
                        <td className="px-4 py-3 text-slate-700">{row.max}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{row.charge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm sm:text-base text-blue-900">
              <span className="font-semibold">Why Tumizi is better for stores:</span> on common
              ranges (for example 1,001-1,500 and 1,501-2,500), Tumizi charges are lower than
              standard M-Pesa transfer fees, while also giving you automatic checkout verification
              and a dedicated business wallet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
