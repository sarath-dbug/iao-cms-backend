import type { Schema, Struct } from '@strapi/strapi';

export interface AboutHero extends Struct.ComponentSchema {
  collectionName: 'components_about_heroes';
  info: {
    displayName: 'Hero';
  };
  attributes: {
    intro: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
    videoThumbnail: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    videoUrl: Schema.Attribute.String;
  };
}

export interface AboutMission extends Struct.ComponentSchema {
  collectionName: 'components_about_missions';
  info: {
    displayName: 'Mission';
  };
  attributes: {
    closing: Schema.Attribute.String;
    intro: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
    valuesLine: Schema.Attribute.Blocks;
  };
}

export interface AboutValueItem extends Struct.ComponentSchema {
  collectionName: 'components_about_value_items';
  info: {
    displayName: 'Value Item';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

export interface ContactForm extends Struct.ComponentSchema {
  collectionName: 'components_contact_forms';
  info: {
    displayName: 'Form';
  };
  attributes: {
    consentAfter: Schema.Attribute.String;
    consentBefore: Schema.Attribute.String;
    consentLinkText: Schema.Attribute.String;
    emailLabel: Schema.Attribute.String;
    firstNameLabel: Schema.Attribute.String;
    lastNameLabel: Schema.Attribute.String;
    messageLabel: Schema.Attribute.String;
    submitLabel: Schema.Attribute.String;
  };
}

export interface CsrCsrSection extends Struct.ComponentSchema {
  collectionName: 'components_csr_csr_sections';
  info: {
    description: 'A titled CSR pillar with a list of bullet points';
    displayName: 'CSR Section';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.list-item', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EventsEventItem extends Struct.ComponentSchema {
  collectionName: 'components_events_event_items';
  info: {
    description: 'A single scheduled event with date, time, and registration link';
    displayName: 'Event Item';
  };
  attributes: {
    date_short: Schema.Attribute.String;
    day_label: Schema.Attribute.String;
    register_label: Schema.Attribute.String & Schema.Attribute.Required;
    register_url: Schema.Attribute.String & Schema.Attribute.Required;
    time: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EventsEventSection extends Struct.ComponentSchema {
  collectionName: 'components_events_event_sections';
  info: {
    description: "A titled group of events (e.g. '4-Year Programme Open Days')";
    displayName: 'Event Section';
  };
  attributes: {
    events: Schema.Attribute.Component<'events.event-item', true>;
    heading: Schema.Attribute.String;
  };
}

export interface FaqCategory extends Struct.ComponentSchema {
  collectionName: 'components_faq_categories';
  info: {
    displayName: 'category';
  };
  attributes: {
    items: Schema.Attribute.Component<'faq.faq-item', true>;
    title: Schema.Attribute.String;
  };
}

export interface FaqFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_faq_faq_item_s';
  info: {
    displayName: 'faqItem ';
  };
  attributes: {
    answer: Schema.Attribute.Blocks;
    question: Schema.Attribute.String;
  };
}

export interface LegalArticleSection extends Struct.ComponentSchema {
  collectionName: 'components_legal_article_sections';
  info: {
    description: 'A numbered article/clause for Terms & Conditions';
    displayName: 'Article Section';
  };
  attributes: {
    body: Schema.Attribute.Blocks;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedClinicFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_clinic_faq_items';
  info: {
    description: 'A question + rich text answer for the Associated Clinics FAQ accordion';
    displayName: 'Clinic FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.Blocks;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedListItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_list_items';
  info: {
    description: 'A single text bullet point';
    displayName: 'List Item';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPageSection extends Struct.ComponentSchema {
  collectionName: 'components_shared_page_sections';
  info: {
    description: 'A titled section with rich text body \u2014 used in legal/policy pages';
    displayName: 'Page Section';
  };
  attributes: {
    body: Schema.Attribute.Blocks;
    section_title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.hero': AboutHero;
      'about.mission': AboutMission;
      'about.value-item': AboutValueItem;
      'contact.form': ContactForm;
      'csr.csr-section': CsrCsrSection;
      'events.event-item': EventsEventItem;
      'events.event-section': EventsEventSection;
      'faq.category': FaqCategory;
      'faq.faq-item': FaqFaqItem;
      'legal.article-section': LegalArticleSection;
      'shared.clinic-faq-item': SharedClinicFaqItem;
      'shared.list-item': SharedListItem;
      'shared.page-section': SharedPageSection;
    }
  }
}
