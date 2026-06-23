/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Twende Green Ecocycle verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="180" height="auto" alt="Twende Green Ecocycle" style={logoImg} />
        </Section>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>© Twende Green Ecocycle · Circular Economy Traceability</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const LOGO_URL = 'https://gbchyukefjnqhvajlehl.supabase.co/storage/v1/object/public/email-assets/duara-flow-logo.png'

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '40px 32px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { display: 'flex' as const, alignItems: 'center' as const, gap: '10px', marginBottom: '32px' }
const logoImg = { borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#12211A', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif", margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#677A6F', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: "'Space Grotesk', Courier, monospace", fontSize: '28px', fontWeight: 'bold' as const, color: '#3B9B62', margin: '0 0 30px', letterSpacing: '4px' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
const footerBrand = { fontSize: '12px', color: '#BBBBBB', margin: '16px 0 0' }
