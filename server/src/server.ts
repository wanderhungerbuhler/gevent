import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import twilio from 'twilio';

import { prisma } from '../prisma/prisma';

const app = express();
app.use(cors());
app.use(express.json())

const transport = nodemailer.createTransport({
  // GMAIL
  // service: "gmail",
  // auth: {
  //   user: process.env.NODEMAILER_GMAIL_USER,
  //   pass: process.env.NODEMAILER_GMAIL_PASS,
  // },

  // Mail Trap
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.NODEMAILER_MAILTRAP_USER,
    pass: process.env.NODEMAILER_MAILTRAP_PASS
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const data = await prisma.tickets.findMany({
      select: {
        img_url: true,
        title: true,
        description: true,
        price: true,
        date: true,
        id: true,
        category: {
          select: { id: true, name: true }
        },
      },
    })

    return res.status(200).json({ data });
  } catch (error) {
    console.log(error)
  }
})

app.post('/users', async (req, res) => {
  const { full_name, cpf, email, phone, id_ticket, qtd_ticket_event, title_event, date_event, description_event } = req.body;

  try {
    const users = await prisma.users.create({
      data: {
        full_name,
        cpf,
        email,
        phone,
        tickets: {
          connect: {
            id: String(id_ticket),

          }
        }
      }
    }).then(async (response) => {
      if (response) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        await client.messages.create({
          to: `+55${phone}`,
          from: process.env.TWILIO_SMS_FROM,
          body: `GEVENT: Solicitação de ingresso para ${title_event} recebido com sucesso!`,
        })
      }
    });

    await transport.sendMail({
      from: "GEVENT <falecom@gevent.com.br>",
      to: `${full_name} <${email}>`,
      subject: "Finalize sua compra e garanta seu ingresso!",
      html: [`
      <!DOCTYPE html>
      <html lang="pt_BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
      </head>
      <body>
        <div style="max-width: 1000px; width: 100%;">
          <div style="max-width: 600px; width: 100%; margin: 0 auto;">
            <h1 style="font-family: 'Poppins', sans-serif; background-image: linear-gradient(90deg, #6C5DD3, #3E8CFF);
              padding: 10px; color: #F0F0F5; letter-spacing: -2px; border-top-left-radius: 7px; border-top-right-radius: 7px;">
              <img src="https://gevent.vercel.app/assets/logo-signin.4a2e386d.svg" width="150" height="50" style="margin:0 auto; display: block;" /><br />
              Olá, ${full_name}
            </h1>
            <div style="padding: 0 10px;">
              <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #383838;">
                Seu ingresso para o evento <b>${title_event}</b> está aguardando você!
              </p>
              <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #383838;">
                Este e-mail, é o comprovante do pedido de compra feito pelo sistema <b style="color: #6C5DD3;">geVent</b>.
              </p>
              <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #383838;">
                Abaixo, está o comprovante detalhado.
              </p>
              <div style="margin: 0 auto; padding: 10px; background-image: linear-gradient(90deg, #6C5DD3, #3E8CFF);">
                <h3 style="font-size: 20px; font-family: 'Poppins', sans-serif; color: #FFFFFF; text-transform: uppercase;">${title_event}</h3>
                <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #FFFFFF;">Qtd. Ingressos: ${qtd_ticket_event}</p>
                <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #FFFFFF;">Data do Evento: ${date_event}</p>
                <p style="font-size: 20px; font-family: 'Poppins', sans-serif; color: #FFFFFF;"><b>Descrição do Evento</b></p>
                <p style="font-size: 15px; font-family: 'Poppins', sans-serif; color: #FFFFFF;">${description_event}</p>
              </div>
              <p style="font-size: 12px; text-align: center; font-family: 'Poppins', sans-serif; color: #383838;">
                *Em caso de dúvidas, pedimos que entre em contato através dos números:
              </p>
              <p style="font-size: 12px; text-align: center; font-family: 'Poppins', sans-serif; color: #383838;">
                <b>(21) 97585-4490</b>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `].join('\n')
    });

    return res.status(201).json({ data: users });
  } catch (error) {
    console.log(error)
  }

});

app.listen(process.env.PORT || 3333, () => {
  console.log(`Server is running!`);
});
