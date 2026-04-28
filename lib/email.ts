import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type Dealer = {
  name: string;
  email: string | null;
};

type Lead = {
  customer_name: string | null;
  customer_email: string | null;
  vehicleLabel: string;
  offerAmount: number | null;
};

export async function sendDealerFollowupEmail(input: {
  dealer: Dealer;
  lead: Lead;
}) {
  if (!input.lead.customer_email) return;

  await resend.emails.send({
    from: `${input.dealer.name} <offers@solacetrade.ai>`,
    reply_to: input.dealer.email || undefined,
    to: input.lead.customer_email,
    subject: "We reviewed your vehicle — next step",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${input.lead.customer_name || "there"},</p>

        <p>
          We just reviewed your <strong>${input.lead.vehicleLabel}</strong>.
        </p>

        <p>
          Based on what you submitted, your offer looks strong.
          Final value is confirmed once we see it in person.
        </p>

        ${
          input.lead.offerAmount
            ? `<p><strong>Current offer: $${input.lead.offerAmount.toLocaleString()}</strong></p>`
            : ""
        }

        <p>
          What’s easiest for you — stop by or set a quick time?
        </p>

        <p>
          — ${input.dealer.name}
        </p>

        <hr style="margin-top:20px;" />
        <p style="font-size:12px; color:#64748b;">
          Powered by SolaceTrade
        </p>
      </div>
    `,
  });
}
