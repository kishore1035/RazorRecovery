import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

async function main() {
  const links = [];
  for (let i = 0; i < 3; i++) {
    const amount = (Math.floor(Math.random() * 5000) + 500) * 100;
    const link = await rzp.paymentLink.create({
      amount,
      currency: "INR",
      description: `Test Order ${i + 1}`,
      customer: {
        name: "Kishore P",
        email: "pkishore530@gmail.com",
        contact: "9876543210"
      },
      notify: { sms: false, email: false },
      reminder_enable: false
    });
    links.push(link.short_url);
    console.log(`LINK ${i+1}:`, link.short_url);
  }
}

main().catch(console.error);
