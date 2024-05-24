import nodemailer from 'nodemailer'

export const kirimEmail = dataEmail => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        requireTLS: true,
        auth: {
          user: process.env.NODEMAILER, // generated ethereal user
          pass: process.env.NODEMAILER_PASS, // generated ethereal password
        },
      });
      return(
        transporter.sendMail(dataEmail)
        .then(info => console.log(`Email terkirim: ${info.message}`))
        .catch(err => console.log(`Terjadi kesalahan: ${err}`))
      )
}