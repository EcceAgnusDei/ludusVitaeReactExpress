import React, { useMemo, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { Menu } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

import { SignUpForm } from "./SignUpForm";
import { SignInForm } from "./SignInForm";

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

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);

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
          if (fromMobileSheet) setIsOpen(false);
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
          if (fromMobileSheet) setIsOpen(false);
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
          if (fromMobileSheet) setIsOpen(false);
          void authClient.signOut();
        },
      },
    ],
    [],
  );

  const visibleLinks = navItems.filter(
    (item): item is NavLinkItem =>
      item.kind === "link" && isLinkVisible(item, isLoggedIn),
  );
  const visibleActions = navItems.filter(
    (item): item is NavActionItem =>
      isNavActionItem(item) && isActionVisible(item, isLoggedIn),
  );

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
            visibleActions.map((item) => (
              <Button
                key={item.id}
                variant={item.variant}
                onClick={() => item.onSelect(false)}
              >
                {item.name}
              </Button>
            ))
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Menu className="!h-9 !w-9 text-foreground" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-80">
            <div className="flex flex-col gap-6 mt-10">
              {visibleLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="ghost"
                  className="justify-start text-lg h-12 w-full"
                  asChild
                >
                  <a href={link.href} onClick={() => setIsOpen(false)}>
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
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={isSignUpOpen} onClose={() => setIsSignUpOpen(false)}>
        <SignUpForm onClose={() => setIsSignUpOpen(false)} />
      </Dialog>

      <Dialog open={isLoginOpen} onClose={() => setIsLoginOpen(false)}>
        <SignInForm onClose={() => setIsLoginOpen(false)} />
      </Dialog>
    </header>
  );
}
