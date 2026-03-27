"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { authClient } from "@/lib/auth-client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

const signInSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SignInForm({ onClose }: { onClose?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema as never),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (values: SignInFormValues) => {
    setIsLoading(true);
    setFormError(null);

    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setFormError(
          error.message || "Une erreur est survenue lors de la connexion.",
        );
        return;
      }

      setLoginSucceeded(true);
    } catch {
      setFormError("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loginSucceeded) {
    return (
      <Card className="w-full relative">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3"
          onClick={() => onClose?.()}
          aria-label="Fermer"
        >
          <X />
        </Button>
        <CardHeader>
          <CardTitle>Connexion réussie</CardTitle>
          <CardDescription>Tu es maintenant connecté.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={() => onClose?.()}>
            Fermer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-3 top-3"
        onClick={() => onClose?.()}
        disabled={isLoading}
        aria-label="Fermer"
      >
        <X />
      </Button>
      <CardHeader>
        <CardTitle>Se connecter</CardTitle>
        <CardDescription>Entre ton email et ton mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {formError && (
            <div className="text-sm text-destructive">{formError}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="signin-email">Adresse email</Label>
            <Input
              id="signin-email"
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

          <div className="space-y-2">
            <Label htmlFor="signin-password">Mot de passe</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connexion
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
