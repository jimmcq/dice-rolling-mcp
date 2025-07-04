import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' || req.method === 'POST') {
    // Return tools list in the format Claude.ai expects
    res.status(200).json({
      tools: [
        {
          name: 'dice_roll',
          description: 'Roll dice using standard notation. Supports standard dice (3d6+2), advantage/disadvantage (2d20kh1), keep/drop (4d6kh3), exploding dice (3d6!), rerolls (4d6r1), and success counting (5d10>7).',
          input_schema: {
            type: 'object',
            properties: {
              notation: { 
                type: 'string', 
                description: 'Dice notation string. Examples: "3d6+2" (standard roll), "2d20kh1" (advantage), "4d6dl1" (drop lowest), "3d6!" (exploding), "4d6r1" (reroll 1s), "5d10>7" (count successes)' 
              },
              label: { 
                type: 'string', 
                description: 'Optional descriptive label for the roll (e.g., "Attack roll", "Damage roll", "Saving throw")' 
              },
              verbose: { 
                type: 'boolean', 
                description: 'When true, shows detailed breakdown of individual dice results and calculations' 
              },
            },
            required: ['notation'],
            additionalProperties: false,
          },
        },
        {
          name: 'dice_validate',
          description: 'Validate dice notation syntax without performing the roll. Useful for checking if notation is correct before rolling.',
          input_schema: {
            type: 'object',
            properties: {
              notation: { 
                type: 'string', 
                description: 'Dice notation string to validate. Examples: "3d6+2", "2d20kh1", "4d6dl1"' 
              },
            },
            required: ['notation'],
            additionalProperties: false,
          },
        },
      ],
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}