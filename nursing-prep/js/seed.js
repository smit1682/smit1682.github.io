/* ═══════════════════════════════════════════════════════
   SEED — the questions the app ships with.
   Used in demo mode only. Once Supabase is connected the
   bank comes from the database instead.
   ═══════════════════════════════════════════════════════ */

window.SEED_TESTS = [
  {
    id: 'seed-1',
    title: 'Sample Set — Fundamentals of Nursing',
    topic: 'Nursing Foundations',
    difficulty: 'medium',
    duration_minutes: 60,
    created_at: '2026-01-01T00:00:00Z',
    questions: [
      {
        question: 'Which of the following vitamins is fat soluble?',
        options: ['Vitamin C', 'Vitamin B12', 'Vitamin A', 'Folic acid'],
        correct_index: 2,
        topic: 'Basic Sciences',
        difficulty: 'easy',
        explanation: 'Vitamins A, D, E and K are fat soluble and are stored in the liver and adipose tissue. Vitamin C and the B-complex vitamins are water soluble and are excreted in urine, so they must be replaced daily.'
      },
      {
        question: 'The normal resting heart rate in a healthy adult is',
        options: ['40–60 beats/min', '60–100 beats/min', '100–120 beats/min', '120–140 beats/min'],
        correct_index: 1,
        topic: 'Basic Sciences',
        difficulty: 'easy',
        explanation: 'A normal adult resting pulse is 60–100 beats/min. Below 60 is bradycardia, above 100 is tachycardia. Trained athletes may sit below 60 without it being abnormal.'
      },
      {
        question: 'Which position is best for a patient in hypovolaemic shock?',
        options: ['Fowler position', 'Prone position', 'Modified Trendelenburg with legs raised', 'Left lateral position'],
        correct_index: 2,
        topic: 'Medical-Surgical Nursing',
        difficulty: 'medium',
        explanation: 'Raising the legs while keeping the trunk flat promotes venous return to the heart and improves perfusion of vital organs. Full Trendelenburg is avoided as it pushes abdominal organs against the diaphragm and impairs breathing.'
      },
      {
        question: 'The most reliable single measure to prevent hospital acquired infection is',
        options: ['Wearing sterile gloves at all times', 'Hand hygiene', 'Prophylactic antibiotics', 'Daily disinfection of floors'],
        correct_index: 1,
        topic: 'Nursing Foundations',
        difficulty: 'easy',
        explanation: 'Hand hygiene is the single most effective and lowest-cost intervention for preventing healthcare associated infection. The WHO "5 moments" define when it must be performed.'
      },
      {
        question: 'Normal range of fasting blood glucose in an adult is',
        options: ['40–60 mg/dL', '70–100 mg/dL', '110–140 mg/dL', '150–180 mg/dL'],
        correct_index: 1,
        topic: 'Basic Sciences',
        difficulty: 'medium',
        explanation: 'Fasting plasma glucose of 70–100 mg/dL is normal. 100–125 mg/dL indicates impaired fasting glucose (prediabetes), and 126 mg/dL or above on two occasions is diagnostic of diabetes mellitus.'
      },
      {
        question: 'Which cranial nerve is responsible for the gag reflex?',
        options: ['Trigeminal (V)', 'Facial (VII)', 'Glossopharyngeal (IX)', 'Hypoglossal (XII)'],
        correct_index: 2,
        topic: 'Basic Sciences',
        difficulty: 'hard',
        explanation: 'The glossopharyngeal nerve (IX) carries the sensory limb of the gag reflex; the vagus nerve (X) carries the motor limb. Testing it is important before feeding a patient with a suspected swallowing deficit.'
      },
      {
        question: 'A patient on warfarin should be monitored primarily using',
        options: ['aPTT', 'INR', 'Bleeding time', 'Platelet count'],
        correct_index: 1,
        topic: 'Nursing Foundations',
        difficulty: 'hard',
        explanation: 'Warfarin acts on the extrinsic pathway, monitored by prothrombin time reported as INR. Heparin, which acts on the intrinsic pathway, is the drug monitored using aPTT.'
      },
      {
        question: 'The chief function of surfactant in the lungs is to',
        options: ['Increase alveolar surface tension', 'Reduce alveolar surface tension and prevent collapse', 'Transport oxygen across the alveolar membrane', 'Trap inhaled dust particles'],
        correct_index: 1,
        topic: 'Basic Sciences',
        difficulty: 'medium',
        explanation: 'Surfactant, produced by type II pneumocytes, lowers surface tension in the alveoli so they do not collapse at the end of expiration. Its deficiency in preterm babies causes respiratory distress syndrome.'
      }
    ]
  }
];
