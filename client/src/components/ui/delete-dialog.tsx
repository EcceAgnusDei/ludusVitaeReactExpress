import * as React from "react";
import { Loader2 } from "lucide-react";
import { AlertDialog as Primitive } from "radix-ui";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function AlertDialogRoot({
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-[100] bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
      <Primitive.Content
        className={cn(
          "fixed top-[50%] left-[50%] z-[101] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Cancel>) {
  return (
    <Primitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  /** Empêche la fermeture (Annuler, clic extérieur, Échap) pendant `pending`. */
  blockCloseWhilePending?: boolean;
  cancelLabel?: string;
  confirmLabel?: React.ReactNode;
  /** Contenu du bouton de confirmation pendant `pending`. */
  confirmPendingLabel?: React.ReactNode;
  /** Affiche un indicateur de chargement à côté de `confirmPendingLabel`. */
  confirmPendingSpinner?: boolean;
  error?: string | null;
};

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending = false,
  blockCloseWhilePending = true,
  cancelLabel = "Annuler",
  confirmLabel = "Supprimer",
  confirmPendingLabel = "Suppression…",
  confirmPendingSpinner = false,
  error,
}: DeleteDialogProps) {
  return (
    <AlertDialogRoot
      open={open}
      onOpenChange={(next) => {
        if (!next && pending && blockCloseWhilePending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? (
              confirmPendingSpinner ? (
                <>
                  <Loader2
                    className="mr-2 size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  {confirmPendingLabel}
                </>
              ) : (
                confirmPendingLabel
              )
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
