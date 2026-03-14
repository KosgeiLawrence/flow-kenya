/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  couponCode?: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  couponCode,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Duara Flow</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="180" height="auto" alt="Duara Flow" style={logoImg} />
        </Section>
        <Heading style={h1}>You've been invited 🎉</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Duara Flow</strong>
          </Link>
          — Kenya's circular economy traceability platform. Click below to create your account and get started.
        </Text>
        {couponCode ? (
          <Section style={couponSection}>
            <Text style={couponLabel}>🎁 Your Coupon Code</Text>
            <Text style={couponCodeStyle}>{couponCode}</Text>
            <Text style={couponHint}>Apply this code during signup to unlock your discount.</Text>
          </Section>
        ) : null}
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Create Your Account
          </Button>
        </Section>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>© Duara Flow · Circular Economy Traceability</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const LOGO_URL = 'https://gbchyukefjnqhvajlehl.supabase.co/storage/v1/object/public/email-assets/duara-flow-logo.png'

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { display: 'flex' as const, alignItems: 'center' as const, gap: '10px', marginBottom: '32px' }
const logoImg = { borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#12211A', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif", margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#677A6F', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#1F6B45', textDecoration: 'underline' }
const buttonSection = { margin: '8px 0 32px' }
const button = { backgroundColor: '#D4A843', color: '#12211A', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif" }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
const footerBrand = { fontSize: '12px', color: '#BBBBBB', margin: '16px 0 0' }
