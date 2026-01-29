"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { Menu, LogOut, User, Heart, BookOpen, ChevronDown, Bell, ShoppingBag } from "lucide-react"
import { Container } from "./Container"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { useAuth } from "@/hooks/useAuth"
import { NotificationBell } from "@/components/notifications"
import { useGlampingCart } from "@/components/providers/GlampingCartProvider"
import { GlampingCartPopover } from "@/components/glamping-booking/GlampingCartPopover"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const t = useTranslations('header')
  const { user, loading, isStaff, isCustomer, logout } = useAuth()
  const { cartCount } = useGlampingCart()

  return (
    <header className="border-b bg-white sticky top-0 z-[1001]">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo_glamping_transparent.png"
              alt="CampingHub Logo"
              width={60}
              height={60}
              className="rounded"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('explore')}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('aboutUs')}
            </Link>
          </nav>

          {/* Desktop Auth Buttons & Language Switcher */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />

            {/* Cart Icon with Popover */}
            <GlampingCartPopover>
              <Button
                variant="ghost"
                size="icon"
                className="relative cursor-pointer"
                aria-label={`Giỏ hàng (${cartCount} item${cartCount !== 1 ? 's' : ''})`}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </GlampingCartPopover>

            {loading ? (
              <div className="text-sm text-muted-foreground">...</div>
            ) : isStaff ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href={(user as any)?.role === 'owner' ? '/admin-camping/owner-dashboard' : '/admin'}>
                    {(user as any)?.role === 'owner' ? 'Trang Owner' : 'Trang Admin'}
                  </Link>
                </Button>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('logout')}
                </Button>
              </>
            ) : user && isCustomer ? (
              <>
                <NotificationBell userType="customer" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="max-w-[100px] truncate">
                      {user.firstName || user.email}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[1100]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || 'My Account'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      {t('wishlist')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {t('profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="cursor-pointer">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {t('bookings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">{t('signup')}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Language Switcher & Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />

            {/* Mobile Cart Icon with Popover */}
            <GlampingCartPopover>
              <Button
                variant="ghost"
                size="icon"
                className="relative cursor-pointer"
                aria-label={`Giỏ hàng (${cartCount} item${cartCount !== 1 ? 's' : ''})`}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </GlampingCartPopover>

            {user && isCustomer && <NotificationBell userType="customer" />}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Toggle menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Mobile Logo */}
                <div className="flex items-center gap-2 mb-8">
                  <Image
                    src="/images/logo_glamping_transparent.png"
                    alt="CampingHub Logo"
                    width={60}
                    height={60}
                    className="rounded"
                  />
                  
                </div>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-4 mb-8">
                  <Link
                    href="/search"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('explore')}
                  </Link>
                  <Link
                    href="/about"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('aboutUs')}
                  </Link>
                </nav>

                {/* Mobile Auth Buttons */}
                <div className="flex flex-col gap-3 mt-auto">
                  {loading ? (
                    <div className="text-center text-muted-foreground">...</div>
                  ) : isStaff ? (
                    <>
                      <Button variant="outline" size="lg" asChild>
                        <Link
                          href={(user as any)?.role === 'owner' ? '/admin-camping/owner-dashboard' : '/admin'}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {(user as any)?.role === 'owner' ? 'Trang Owner' : 'Trang Admin'}
                        </Link>
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                      </Button>
                    </>
                  ) : user && isCustomer ? (
                    <>
                      {/* Customer Account Info */}
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.firstName || 'My Account'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button variant="ghost" size="sm" asChild className="justify-start">
                            <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)}>
                              <Heart className="mr-2 h-4 w-4" />
                              {t('wishlist')}
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="justify-start">
                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                              <User className="mr-2 h-4 w-4" />
                              {t('profile')}
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="justify-start">
                            <Link href="/bookings" onClick={() => setMobileMenuOpen(false)}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              {t('bookings')}
                            </Link>
                          </Button>
                          </div>
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" asChild>
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                          {t('login')}
                        </Link>
                      </Button>
                      <Button size="lg" asChild>
                        <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                          {t('signup')}
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  )
}
