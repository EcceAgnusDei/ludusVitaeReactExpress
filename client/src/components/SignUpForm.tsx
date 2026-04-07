"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { authClient } from "@/lib/auth-client"; // ton fichier créé précédemment

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

// Schéma de validation Zod
const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre"),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignUpForm({ onClose }: { onClose?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema as never),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    setFormError(null);

    try {
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        // callbackURL: '/mon-espace', // optionnel : redirection après inscription réussie
      });

      if (error) {
        const apiMessage =
          error.message || "Une erreur est survenue lors de l'inscription.";
        console.error(apiMessage);
        setFormError(apiMessage);
        return;
      }

      setRegistrationSucceeded(true);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      setFormError("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSucceeded) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Inscription réussie</CardTitle>
          <CardDescription>Le compte a bien été créé.</CardDescription>
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Remplis les informations ci-dessous pour t'inscrire
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {formError && (
            <div className="text-sm text-destructive">{formError}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nom d&apos;utilisateur</Label>
            <Input
              id="name"
              placeholder="Jean Dupont"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jean@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
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
            Créer mon compte
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
