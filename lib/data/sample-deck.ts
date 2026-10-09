/**
 * The built-in sample deck: 24 cards across world capitals, languages and basic science.
 *
 * Its own data module, deliberately separate from any component that renders or loads it — the same
 * shape a visitor's deck file takes, so loading it goes through the exact same validation and
 * duplicate-skipping path as a file chosen from disk.
 */
export type SampleCard = { front: string; back: string };

export const SAMPLE_DECK_NAME = "Sample deck";

export const SAMPLE_DECK: { name: string; cards: SampleCard[] } = {
  name: SAMPLE_DECK_NAME,
  cards: [
    // World capitals
    { front: "What is the capital of France?", back: "Paris" },
    { front: "What is the capital of Japan?", back: "Tokyo" },
    { front: "What is the capital of Canada?", back: "Ottawa" },
    { front: "What is the capital of Brazil?", back: "Brasília" },
    { front: "What is the capital of Australia?", back: "Canberra" },
    { front: "What is the capital of Egypt?", back: "Cairo" },
    { front: "What is the capital of Turkey?", back: "Ankara" },
    { front: "What is the capital of Switzerland?", back: "Bern" },
    { front: "What is the capital of Kenya?", back: "Nairobi" },
    { front: "What is the capital of Vietnam?", back: "Hanoi" },

    // Languages
    { front: "What language do most people speak as their first language?", back: "Mandarin Chinese" },
    { front: "What is the official language of Brazil?", back: "Portuguese" },
    { front: "What is the official language of Egypt?", back: "Arabic" },
    { front: "What is the official language of Japan?", back: "Japanese" },
    { front: "What is the official language of the Netherlands?", back: "Dutch" },
    { front: "What is the official language of Iran?", back: "Persian (Farsi)" },
    { front: "What is the official language of Peru?", back: "Spanish" },

    // Basic science
    { front: "What is the chemical symbol for gold?", back: "Au" },
    { front: "Which planet is known as the Red Planet?", back: "Mars" },
    { front: "Which planet is the largest in the solar system?", back: "Jupiter" },
    { front: "What gas do plants absorb from the air for photosynthesis?", back: "Carbon dioxide (CO₂)" },
    { front: "Roughly how fast does light travel in a vacuum?", back: "About 300,000 km per second" },
    { front: "What force keeps the planets in orbit around the Sun?", back: "Gravity" },
    { front: "At what temperature does water freeze at sea level?", back: "0 °C (32 °F)" },
  ],
};
