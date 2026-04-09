import React, { useCallback, useMemo, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { Menu, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Dialog } from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

import { SignUpForm } from "./SignUpForm";
import { SignInForm } from "./SignInForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type NavLinkItem = {
  id: string;
  kind: "link";
  name: string;
  href: string;
  /** `true` : visible pour tout le monde. `false` : uniquement si connecté. */
  public: boolean;
};

type ActionButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

type NavActionItem = {
  id: string;
  kind: "action";
  name: string;
  variant: ActionButtonVariant;
  /** `true` : visible si non connecté (connexion / inscription). `false` : si connecté (déconnexion). */
  public: boolean;
  /** `fromMobileSheet` : `true` si le clic vient du menu mobile (ferme le menu mobile avant l’action). */
  onSelect: (fromMobileSheet: boolean) => void;
};

type NavItem = NavLinkItem | NavActionItem;

function isNavActionItem(item: NavItem): item is NavActionItem {
  return item.kind === "action";
}

function isLinkVisible(item: NavLinkItem, isLoggedIn: boolean): boolean {
  return item.public || isLoggedIn;
}

function isActionVisible(item: NavActionItem, isLoggedIn: boolean): boolean {
  return item.public ? !isLoggedIn : isLoggedIn;
}

const AUTH_UNREACHABLE_MESSAGE =
  "Le serveur ne répond pas (connexion ou base de données indisponible). Réessayez plus tard.";

function isAuthFetchUnreachableError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message === "Failed to fetch" ||
      err.message.includes("fetch") ||
      err.message.includes("NetworkError"))
  );
}

export default function Header() {
  const navigate = useNavigate();
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordFormKey, setForgotPasswordFormKey] = useState(0);
  const [deleteAccountPending, setDeleteAccountPending] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);

  const openForgotPasswordModal = useCallback(() => {
    setIsLoginOpen(false);
    setForgotPasswordFormKey((k) => k + 1);
    setIsForgotPasswordOpen(true);
  }, []);

  const handleSignOut = useCallback(async (fromMobileSheet: boolean) => {
    if (fromMobileSheet) setMenuSheetOpen(false);
    setSignOutError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setSignOutError(
          typeof error.message === "string" && error.message
            ? error.message
            : "La déconnexion a échoué. Réessayez.",
        );
        return;
      }
    } catch (err) {
      setSignOutError(
        isAuthFetchUnreachableError(err)
          ? AUTH_UNREACHABLE_MESSAGE
          : err instanceof Error && err.message
            ? err.message
            : "La déconnexion a échoué. Réessayez.",
      );
    }
  }, []);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "play", kind: "link", name: "Jouer", href: "/", public: true },
      {
        id: "popular",
        kind: "link",
        name: "Poluaires",
        href: "/populaires",
        public: true,
      },
      {
        id: "recent",
        kind: "link",
        name: "Récents",
        href: "/recents",
        public: true,
      },
      {
        id: "my-space",
        kind: "link",
        name: "Mon espace",
        href: "/mon-espace",
        public: false,
      },
      {
        id: "sign-in",
        kind: "action",
        name: "Se connecter",
        variant: "ghost",
        public: true,
        onSelect(fromMobileSheet) {
          if (fromMobileSheet) setMenuSheetOpen(false);
          setIsLoginOpen(true);
        },
      },
      {
        id: "sign-up",
        kind: "action",
        name: "Inscription",
        variant: "default",
        public: true,
        onSelect(fromMobileSheet) {
          if (fromMobileSheet) setMenuSheetOpen(false);
          setIsSignUpOpen(true);
        },
      },
      {
        id: "sign-out",
        kind: "action",
        name: "Déconnexion",
        variant: "ghost",
        public: false,
        onSelect(fromMobileSheet) {
          void handleSignOut(fromMobileSheet);
        },
      },
    ],
    [handleSignOut],
  );

  const visibleLinks = navItems.filter(
    (item): item is NavLinkItem =>
      item.kind === "link" && isLinkVisible(item, isLoggedIn),
  );
  const visibleActions = navItems.filter(
    (item): item is NavActionItem =>
      isNavActionItem(item) && isActionVisible(item, isLoggedIn),
  );

  async function handleDeleteAccount() {
    setDeleteAccountError(null);
    setDeleteAccountPending(true);
    try {
      const { error } = await authClient.deleteUser({
        callbackURL: `${window.location.origin}/`,
      });
      if (error) {
        setDeleteAccountError(
          typeof error.message === "string" && error.message
            ? error.message
            : "La suppression du compte a échoué. Réessayez ou reconnectez-vous.",
        );
        return;
      }
      setDeleteConfirmOpen(false);
      setAccountSheetOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteAccountError(
        isAuthFetchUnreachableError(err)
          ? AUTH_UNREACHABLE_MESSAGE
          : err instanceof Error && err.message
            ? err.message
            : "La suppression du compte a échoué. Réessayez ou reconnectez-vous.",
      );
    } finally {
      setDeleteAccountPending(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex justify-between h-16 items-center px-4">
        <div className="flex items-center gap-2">
          <div className="font-bold text-2xl tracking-tight">MonApp</div>
        </div>

        <nav className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-8">
            {visibleLinks.map((link) => (
              <Button
                key={link.id}
                variant="ghost"
                asChild
                className="text-base font-medium hover:bg-transparent hover:text-primary transition-colors"
              >
                <a href={link.href}>{link.name}</a>
              </Button>
            ))}
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isPending ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : (
            <>
              {visibleActions.map((item) => (
                <Button
                  key={item.id}
                  variant={item.variant}
                  onClick={() => item.onSelect(false)}
                >
                  {item.name}
                </Button>
              ))}
              {isLoggedIn ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Paramètres du compte"
                  onClick={() => setAccountSheetOpen(true)}
                >
                  <Settings className="h-5 w-5" aria-hidden />
                </Button>
              ) : null}
            </>
          )}
        </div>

        <Sheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:hidden"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuSheetOpen(true)}
          >
            <Menu className="!h-9 !w-9 text-foreground" aria-hidden />
          </Button>

          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="sr-only">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 mt-10">
              {visibleLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="ghost"
                  className="justify-start text-lg h-12 w-full"
                  asChild
                >
                  <a href={link.href} onClick={() => setMenuSheetOpen(false)}>
                    {link.name}
                  </a>
                </Button>
              ))}

              <div className="pt-6 border-t flex flex-col gap-3">
                {isPending
                  ? null
                  : visibleActions.map((item) => (
                      <Button
                        key={item.id}
                        variant={item.variant}
                        className="w-full"
                        onClick={() => item.onSelect(true)}
                      >
                        {item.name}
                      </Button>
                    ))}
              </div>

              {isLoggedIn && !isPending ? (
                <div className="pt-6 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 w-full justify-start text-lg"
                    onClick={() => {
                      setMenuSheetOpen(false);
                      setAccountSheetOpen(true);
                    }}
                  >
                    Paramètres
                  </Button>
                </div>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet
          open={accountSheetOpen}
          onOpenChange={(open) => {
            setAccountSheetOpen(open);
            if (!open) {
              setDeleteAccountError(null);
              setDeleteConfirmOpen(false);
            }
          }}
        >
          <SheetContent side="right" className="w-80 z-[60]">
            <SheetHeader>
              <SheetTitle className="sr-only">Paramètres du compte</SheetTitle>
            </SheetHeader>
            <div className="mt-10 flex flex-col gap-3">
              {isLoggedIn && !isPending ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Supprimer mon compte
                </Button>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>

        <DeleteDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open);
            if (!open) setDeleteAccountError(null);
          }}
          title="Supprimer votre compte ?"
          description={
            <>
              Votre compte et toutes les données associées (grilles
              enregistrées, likes, etc.) seront supprimés de façon définitive.
              Cette action ne peut pas être annulée.
            </>
          }
          error={deleteAccountError}
          pending={deleteAccountPending}
          confirmLabel="Supprimer définitivement"
          confirmPendingSpinner
          onConfirm={() => void handleDeleteAccount()}
        />
      </div>

      {signOutError ? (
        <div className="border-t border-destructive/20 bg-destructive/5">
          <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2 text-sm text-destructive">
            <span>{signOutError}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setSignOutError(null)}
            >
              Fermer
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={isSignUpOpen} onClose={() => setIsSignUpOpen(false)}>
        <SignUpForm onClose={() => setIsSignUpOpen(false)} />
      </Dialog>

      <Dialog open={isLoginOpen} onClose={() => setIsLoginOpen(false)}>
        <SignInForm
          onClose={() => setIsLoginOpen(false)}
          onForgotPassword={openForgotPasswordModal}
        />
      </Dialog>

      <Dialog
        open={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      >
        <ForgotPasswordForm
          key={forgotPasswordFormKey}
          onClose={() => setIsForgotPasswordOpen(false)}
          onBackToSignIn={() => {
            setIsForgotPasswordOpen(false);
            setIsLoginOpen(true);
          }}
        />
      </Dialog>
    </header>
  );
}
