// assets/js/utils/clientSchema.js

// ✅ Default structure for a client
export const clientDefault = {
  id: "",
  title: "",
  first_name: "",
  last_name: "",
  dob: "",
  gender: "",
  status: "Active",
  phone: "",
  email: "",
  address: "",
  councilId: null,
  disabilities: ["None"],
  kin_name: "",
  kin_relation: "",
  kin_relation_other: "",
  kin_address: "",
  kin_email: "",
  ethnicity_type: "",
  ethnicity: "",
  language: "",
  optional_fields: [],
  profile_img: "../images/profile.png"
};

// ✅ Field groupings for rendering sections
export const fieldGroups = {
  "Personal Information": [
    "title",
    "first_name",
    "last_name",
    "id",
    "dob",
    "gender",
    "status"
  ],
  "Contact Details": [
    "phone",
    "email",
    "address"
  ],
  "Disability Information": [
    "disabilities"
  ],
  "Kin Information": [
    "kin_name",
    "kin_relation",
    "kin_address",
    "kin_email"
  ],
  "Other Information": [
    "ethnicity_type",
    "ethnicity",
    "language"
  ],
  "Optional Fields": [
    "optional_fields"
  ]
};

// ✅ Dropdown options
export const titleOptions = ["Dr.", "Master.", "Mr.", "Mrs.", "Ms.", "Miss."];
export const genderOptions = ["Male", "Female", "Other"];
export const kinOptions = ["Father", "Mother", "Brother", "Sister", "Husband", "Wife", "Self", "Other"];

export const ethnicityOptions = {
  "White": [
    "English / Welsh/ Scottish/ Northern Irish/ British",
    "Irish",
    "Gypsy or Irish Traveller",
    "Any Other White Background"
  ],
  "Mixed/Multiple Ethnic Group": [
    "White and Black Caribbean",
    "White and Black African",
    "White and Asian",
    "Any other Mixed / Multiple ethnic background"
  ],
  "Asian/Asian British": [
    "Indian",
    "Pakistani",
    "Bangladeshi",
    "Chinese",
    "Any other Asian background"
  ],
  "Black/African/Caribbean/Black British": [
    "African",
    "Caribbean",
    "Any other Black / African / Caribbean background"
  ],
  "Other Ethnic Group": [
    "Arab",
    "Any other ethnic group"
  ],
  "Prefer not to disclose": [
    "Prefer not to disclose"
  ]
};
