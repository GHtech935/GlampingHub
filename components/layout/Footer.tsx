"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Instagram, Mail } from "lucide-react"
import { useTranslations } from "next-intl"
import { Container } from "./Container"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SocialUrls {
  facebook: string
  twitter: string
  instagram: string
}

export function Footer() {
  const t = useTranslations("footer")
  const [socialUrls, setSocialUrls] = useState<SocialUrls>({
    facebook: "",
    twitter: "",
    instagram: ""
  })

  useEffect(() => {
    const fetchSocialUrls = async () => {
      try {
        const response = await fetch(
          "/api/settings/public?keys=social_facebook_url,social_twitter_url,social_instagram_url"
        )
        if (response.ok) {
          const data = await response.json()
          setSocialUrls({
            facebook: data.settings?.social_facebook_url || "",
            twitter: data.settings?.social_twitter_url || "",
            instagram: data.settings?.social_instagram_url || ""
          })
        }
      } catch (error) {
        console.error("Error fetching social URLs:", error)
      }
    }
    fetchSocialUrls()
  }, [])
  return (
    <footer className="bg-gray-50 border-t">
      <Container className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/images/logo_new.jpg"
                alt="CampingHub Logo"
                width={200}
                height={32}
                className="rounded"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("tagline")}
            </p>
            {(socialUrls.facebook || socialUrls.twitter || socialUrls.instagram) && (
              <div className="flex gap-3">
                {socialUrls.facebook && (
                  <Link
                    href={socialUrls.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Facebook className="h-5 w-5" />
                  </Link>
                )}
                {socialUrls.twitter && (
                  <Link
                    href={socialUrls.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </Link>
                )}
                {socialUrls.instagram && (
                  <Link
                    href={socialUrls.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">{t("explore")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="text-muted-foreground hover:text-foreground">
                  {t("allCampsites")}
                </Link>
              </li>
              <li>
                <Link href="/search?type=glamping" className="text-muted-foreground hover:text-foreground">
                  {t("glamping")}
                </Link>
              </li>
              <li>
                <Link href="/search?type=camping" className="text-muted-foreground hover:text-foreground">
                  {t("camping")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">{t("company")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  {t("aboutUs")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">{t("newsletter")}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t("newsletterDesc")}
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1"
              />
              <Button size="icon">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>{t("copyright")}</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              {t("privacyPolicy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("termsOfService")}
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              {t("cookiePolicy")}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  )
}
