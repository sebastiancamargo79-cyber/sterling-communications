export type ContextType = 'Day in the Life' | 'Supervision' | 'PDP' | 'Support visit'

export interface CareStandard {
  ref: string
  description: string
  defaultContext: ContextType
}

export const CARE_CERTIFICATE_STANDARDS: CareStandard[] = [
  {
    ref: '1.1d',
    description: 'Explain how their previous experiences, attitudes, values and beliefs may affect the way they work',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '1.1e',
    description: 'Identify the different opportunities for professional and career development in the sector',
    defaultContext: 'Supervision',
  },
  {
    ref: '1.2f',
    description: 'Explain why it is important to be honest and identify where errors may have occurred and to tell the appropriate person',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '1.4d',
    description: 'Demonstrate how and when to access support and advice about: partnership working and resolving conflicts',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '2.2b',
    description: 'Explain where to find information and support on how to check and develop own current level of skills in: Literacy, Numeracy, Digital and Communication',
    defaultContext: 'PDP',
  },
  {
    ref: '2.2c',
    description: 'Describe how reflecting on a situation or learning activity has improved their own knowledge, skills and understanding',
    defaultContext: 'PDP',
  },
  {
    ref: '2.2d',
    description: 'Describe how feedback from others has developed their own knowledge, skills and understanding',
    defaultContext: 'PDP',
  },
  {
    ref: '2.2f',
    description: 'List the learning opportunities available to them and how they can use them to improve their ways of working',
    defaultContext: 'PDP',
  },
  {
    ref: '2.2g',
    description: 'Demonstrate how to record progress in relation to their personal development',
    defaultContext: 'PDP',
  },
  {
    ref: '3.3a',
    description: 'Demonstrate how to respond to comments and complaints in line with legislation and agreed ways of working',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '3.5d',
    description: 'Demonstrate how and when to access support and advice about resolving conflicts',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '3.5e',
    description: 'Explain the agreed ways of working for reporting any confrontations',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '5.4a',
    description: 'Take appropriate steps to remove or minimise the environmental factors causing discomfort or distress: Lighting, Noise, Temperature, Unpleasant Odours',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '5.4b / 5.7d / 7.2d / 7.4d / 7.6c / 8.2d / 8.3e',
    description: 'Report any concerns they have to the relevant person (senior member of staff, carer, family member)',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '5.5a',
    description: 'Raise any concerns directly with the individual',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '5.5c',
    description: 'Raise any concerns via other channels or systems e.g. at team meetings',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '6.3c',
    description: 'Describe how to check whether they (Care Professional) have been understood',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '6.3d',
    description: 'Describe where to find information and support of services, to help the individual communicate more effectively',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '6.5b',
    description: 'Describe why it is important to observe and be receptive to an individual\'s reactions when communicating with them',
    defaultContext: 'Support visit',
  },
  {
    ref: '6.6b',
    description: 'Report any concerns about the communication aid/technology or digital communication tool to the appropriate person (senior member of staff, carer, family member)',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '7.2c',
    description: 'Explain why it is important not to disclose anything about the individual that they may wish to be kept private, unless it is appropriate to do so (health condition, sexual orientation, personal history, social circumstances)',
    defaultContext: 'Supervision',
  },
  {
    ref: '7.5d',
    description: 'Describe the importance of enabling individuals to be as independent as possible and to maintain their own network of relationships and connections with their community',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '7.6b',
    description: 'Reflect on how their own personal views could restrict the individual\'s ability to actively participate in their care',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '8.1d',
    description: 'Explain how to promote adequate nutrition and hydration',
    defaultContext: 'Support visit',
  },
  {
    ref: '8.1e',
    description: 'Explain how to identify and report changes or risks relating to nutrition and hydration needs',
    defaultContext: 'Support visit',
  },
  {
    ref: '9.1d',
    description: 'Explain how these conditions may influence a person\'s needs in relation to the care that they may require',
    defaultContext: 'Supervision',
  },
  {
    ref: '9.1e',
    description: 'Explain why it is important to understand that the causes and support needs are different for people with mental health conditions or dementia',
    defaultContext: 'Supervision',
  },
  {
    ref: '9.3b',
    description: 'Describe how to report concerns associated with unmet needs which may arise from mental health conditions or dementia through agreed ways of working',
    defaultContext: 'Supervision',
  },
  {
    ref: '9.4e',
    description: 'Explain ways to engage with and signpost individuals living with a mental health condition or dementia and their families and carers to other services and support',
    defaultContext: 'Supervision',
  },
  {
    ref: '10.1j',
    description: 'Describe the range of potential risks with using technology and how to support individuals to be safe without being risk averse',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '10.1l',
    description: 'Describe where to get information and advice about their role and responsibilities in preventing and protecting individuals from harm and abuse',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '10.2f',
    description: 'List ways in which the likelihood of abuse may be reduced by: working with person-centred values, enabling active participation, promoting choice and rights, working in partnership with others',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '10.4c',
    description: 'Describe the actions to take if they experience barriers in alerting or referring to relevant agencies',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.1e',
    description: 'Explain how to access additional support and information relating to health and safety',
    defaultContext: 'Support visit',
  },
  {
    ref: '13.3b',
    description: 'List tasks relating to moving and assisting that they are not allowed to carry out until they are competent',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.4a',
    description: 'List the different types of accidents and sudden illness that may occur in the course of their work',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.4b',
    description: 'Describe the procedures to be followed if an accident or sudden illness should occur',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.4c',
    description: 'List the emergency first aid actions they are and are not allowed to carry out',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.5b',
    description: 'Describe the agreed ways of working in relation to healthcare tasks (NB: if not providing healthcare at home, state not applicable)',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.5c',
    description: 'List the tasks relating to medication and health care procedures that they are not allowed to carry out until they are competent',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.6a',
    description: 'Describe the hazardous substances in their workplace',
    defaultContext: 'Support visit',
  },
  {
    ref: '13.8a',
    description: 'Describe the measures that are designed to protect their own security at work, and the security of those they support',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.8b',
    description: 'Explain the agreed ways of working for checking the identity of anyone requesting access to premises or information',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.9b',
    description: 'Identify circumstances that tend to trigger factors in themselves and others, that may affect their mental health and wellbeing',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '13.9c',
    description: 'Explain how to access and use resources which are available to support own and others mental health and wellbeing',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '14.1d',
    description: 'Explain how, and to whom, to report if: agreed ways of working and legislation have not been followed; there has been a data breach or risk to data security',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '15.1d',
    description: 'Demonstrate effective hand hygiene using appropriate products',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '15.1e',
    description: 'Explain how your own health and hygiene and exposure to infection at work might pose a risk to the individuals you support and others you meet',
    defaultContext: 'Day in the Life',
  },
  {
    ref: '15.1g',
    description: 'Demonstrate effective use of PPE appropriate to the care activity including putting on and taking off (donning and doffing) safely',
    defaultContext: 'Day in the Life',
  },
]

export const CONTEXT_OPTIONS: ContextType[] = [
  'Day in the Life',
  'Supervision',
  'PDP',
  'Support visit',
]
