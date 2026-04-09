"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordForm({
  onClose,
  onBackToSignIn,
}: {
  onClose?: () => void;
  onBackToSignIn?: () => void;
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema as never),
    defaultValues: { email: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    setFormError(null);

    try {
      const res = await fetch(`${API_BASE}/api/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        setFormError(
          data.message ||
            (res.status === 429
              ? "Trop de tentatives. Réessayez plus tard."
              : "Une erreur est survenue."),
        );
        return;
      }

      setSentMessage(
        data.message ||
          "Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.",
      );
    } catch {
      setFormError("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sentMessage) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Demande enregistrée</CardTitle>
          <CardDescription>{sentMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={() => onClose?.()}>
            Fermer
          </Button>
          {onBackToSignIn ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onBackToSignIn()}
            >
              Retour à la connexion
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indique ton adresse e-mail : si un compte existe, tu recevras un lien
          pour choisir un nouveau mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {formError && (
            <div className="text-sm text-destructive">{formError}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="forgot-email">Adresse email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="jean@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer le lien
            </Button>
            {onBackToSignIn ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => onBackToSignIn()}
              >
                Retour à la connexion
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
