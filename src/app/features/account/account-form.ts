import type { CustomerProfile } from '../../core/api/models';

export interface ProfileFormValue {
  companyName: string;
  contactName: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  fax: string;
}

export type ProfileField = keyof ProfileFormValue;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const PHONE_PATTERN = /^[0-9 +()\-.]{0,24}$/;
const PHONE_ERROR = 'Phone can only contain digits, spaces, +, ( ) and -';
const FAX_ERROR = 'Fax can only contain digits, spaces, +, ( ) and -';

export function toFormValue(profile: CustomerProfile): ProfileFormValue {
  return {
    companyName: profile.companyName,
    contactName: profile.contactName ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    region: profile.region ?? '',
    postalCode: profile.postalCode ?? '',
    country: profile.country ?? '',
    phone: profile.phone ?? '',
    fax: profile.fax ?? '',
  };
}

export function toProfile(value: ProfileFormValue): CustomerProfile {
  const { companyName, contactName, address, city, region, postalCode, country, phone, fax } =
    value;
  return { companyName, contactName, address, city, region, postalCode, country, phone, fax };
}

export function validateProfile(value: ProfileFormValue): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!value.contactName.trim()) {
    errors.contactName = 'Contact name is required.';
  } else if (value.contactName.length > 30) {
    errors.contactName = 'Contact name must be 30 characters or fewer.';
  }
  if (!PHONE_PATTERN.test(value.phone)) errors.phone = PHONE_ERROR;
  if (!PHONE_PATTERN.test(value.fax)) errors.fax = FAX_ERROR;
  if (value.postalCode.length > 10) errors.postalCode = 'Postcode must be 10 characters or fewer.';
  if (!value.country.trim()) errors.country = 'Country is required.';

  return errors;
}
