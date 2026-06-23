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
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your Duara Flow password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="180" height="auto" alt="Duara Flow" style={logoImg} />
        </Section>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your Duara Flow password. Click the button below to choose a new one.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Reset Password
          </Button>
        </Section>
        <Text style={text}>
          This link will expire shortly. If you didn't request a password reset, you can safely ignore this — your password won't be changed.
        </Text>
        <Text style={footerBrand}>© Duara Flow · Circular Economy Traceability</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const LOGO_URL = 'https://gbchyukefjnqhvajlehl.supabase.co/storage/v1/object/public/email-assets/duara-flow-logo.png'

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { display: 'flex' as const, alignItems: 'center' as const, gap: '10px', marginBottom: '32px' }
const logoImg = { borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#12211A', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif", margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#677A6F', lineHeight: '1.6', margin: '0 0 20px' }
const buttonSection = { margin: '8px 0 32px' }
const button = { backgroundColor: '#3B9B62', color: '#FFFFFF', fontSize: '15px', fontWeight: '600' as const, borderRadius: '16px', padding: '14px 28px', textDecoration: 'none', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif" }
const footerBrand = { fontSize: '12px', color: '#BBBBBB', margin: '16px 0 0' }
