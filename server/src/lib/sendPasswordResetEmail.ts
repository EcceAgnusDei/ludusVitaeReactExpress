import nodemailer from "nodemailer";

const GENERIC_SENT =
  "Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.";

export { GENERIC_SENT };

function buildResetUrl(token: string): string {
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  const u = new URL("/reset-password", base);
  u.searchParams.set("token", token);
  return u.toString();
}

/**
 * Envoie le lien par SMTP si configuré ; sinon log en console (dev).
 * Ne jette pas : l’appelant a déjà persisté le token ; en cas d’échec e-mail,
 * on pourrait logger pour investigation sans révéler quoi que ce soit au client.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const resetUrl = buildResetUrl(rawToken);
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.warn(
      "[password-reset] SMTP non configuré — lien (dev uniquement) :",
      resetUrl,
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  const from =
    process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@localhost";

  await transporter.sendMail({
    from,
    to,
    subject: "Réinitialisation de votre mot de passe",
    text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valide limité dans le temps) :\n\n${resetUrl}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.\n`,
    html: `<p>Bonjour,</p><p>Pour choisir un nouveau mot de passe, <a href="${resetUrl}">cliquez ici</a>.</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
  });
}
