import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const RP_NAME = 'LGU HRMS';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

export const webauthnService = {
  async generateEnrollmentOptions(req, employeeId) {
    const existing = await prisma.biometricCredential.findFirst({
      where: withTenant(req, { employeeId }),
    });

    const options = generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: `employee-${employeeId}`,
      userDisplayName: `Employee ${employeeId}`,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      challenge: crypto.randomBytes(32).toString('base64url'),
      excludeCredentials: existing ? [{
        id: Buffer.from(existing.credentialId, 'base64url').toString('base64'),
        type: 'public-key',
        transports: ['internal'],
      }] : [],
    });

    return options;
  },

  async verifyEnrollment(req, employeeId, credentialId, publicKey) {
    const existing = await prisma.biometricCredential.findFirst({
      where: withTenant(req, { employeeId }),
    });
    if (existing) {
      const err = new Error('Credential already enrolled');
      err.status = 409;
      err.code = 'ALREADY_ENROLLED';
      throw err;
    }

    return prisma.biometricCredential.create({
      data: {
        ...withTenant(req, {}),
        employeeId,
        credentialId,
        publicKey,
        counter: 0,
      },
    });
  },

  async generateAuthenticationOptions(req, credentialId) {
    const credential = await prisma.biometricCredential.findFirst({
      where: withTenant(req, { credentialId }),
      include: { employee: true },
    });
    if (!credential) {
      const err = new Error('Credential not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const options = generateAuthenticationOptions({
      rpID: RP_ID,
      challenge: crypto.randomBytes(32).toString('base64url'),
      userVerification: 'required',
      allowCredentials: [{
        id: Buffer.from(credential.credentialId, 'base64url').toString('base64'),
        type: 'public-key',
        transports: ['internal'],
      }],
    });

    return { options, credentialId: credential.credentialId, employeeId: credential.employeeId };
  },

  async verifyAuthentication(req, credentialId, authenticatorResponse) {
    const credential = await prisma.biometricCredential.findFirst({
      where: withTenant(req, { credentialId }),
      include: { employee: true },
    });
    if (!credential) {
      const err = new Error('Credential not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let verification;
    try {
      verification = verifyAuthenticationResponse({
        credential: {
          id: credential.credentialId,
          rawId: Buffer.from(credential.credentialId, 'base64url'),
          response: {
            clientDataJSON: Buffer.from(authenticatorResponse.clientDataJSON, 'base64url'),
            authenticatorData: Buffer.from(authenticatorResponse.authenticatorData, 'base64url'),
            signature: Buffer.from(authenticatorResponse.signature, 'base64url'),
          },
          type: 'public-key',
        },
        challenge: authenticatorResponse.challenge,
        rpID: RP_ID,
        origin: ORIGIN,
        userVerified: true,
      });
    } catch (e) {
      const err = new Error('Biometric verification failed');
      err.status = 401;
      err.code = 'BIOMETRIC_FAILED';
      throw err;
    }

    if (!verification.verified) {
      const err = new Error('Biometric verification failed');
      err.status = 401;
      err.code = 'BIOMETRIC_FAILED';
      throw err;
    }

    await prisma.biometricCredential.update({
      where: withTenant(req, { credentialId }),
      data: { counter: (credential.counter || 0) + 1, lastUsedAt: new Date() },
    });

    return {
      valid: true,
      employeeId: credential.employeeId,
      employeeNumber: credential.employee?.employeeNumber,
      employeeName: `${credential.employee?.firstName ?? ''} ${credential.employee?.lastName ?? ''}`.trim(),
    };
  },
};
