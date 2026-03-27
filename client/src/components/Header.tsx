import React, { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";

import { SignUpForm } from "./SignUpForm";

// ==================== DONNÉES DES LIENS ====================
const navLinks = [
  { name: "Jouer", href: "/" },
  { name: "Poluaires", href: "/populaires" },
  { name: "Récents", href: "/recents" },
  { name: "Mon espace", href: "/monespace" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex justify-between h-16 items-center px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="font-bold text-2xl tracking-tight">MonApp</div>
          </div>

          {/* Navigation Desktop - avec map() */}
          <nav className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  asChild
                  className="text-base font-medium hover:bg-transparent hover:text-primary transition-colors"
                >
                  <a href={link.href}>{link.name}</a>
                </Button>
              ))}
            </div>
          </nav>

          {/* Actions à droite (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost">Se connecter</Button>
            <Button onClick={() => setIsSignUpOpen(true)}>Inscription</Button>
          </div>

          {/* Menu Mobile (Hamburger) */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-12 w-12">
                <Menu className="!h-9 !w-9 text-foreground" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-6 mt-10">
                {navLinks.map((link) => (
                  <Button
                    key={link.href}
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
                  <Button variant="outline" className="w-full">
                    Se connecter
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      setIsSignUpOpen(true);
                    }}
                  >
                    Inscription
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
      </div>

      <Dialog open={isSignUpOpen} onClose={() => setIsSignUpOpen(false)}>
        <SignUpForm onClose={() => setIsSignUpOpen(false)} />
      </Dialog>
    </header>
  );
}
