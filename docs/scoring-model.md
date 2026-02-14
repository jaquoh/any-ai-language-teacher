# Scoring Model

## Factors
- Grammar
- Verbs/conjugation
- Vocabulary
- Fluency/comprehension

## Composite formula
`composite = grammar*w1 + verbs*w2 + vocabulary*w3 + fluency*w4`

Weights are normalized to sum to 1.0.

## Adjustable weighting
Users can tune factor weights in the dashboard.
When weights change, all historical lesson scores are recomputed.

## CEFR mapping
- <20: pre-A1
- 20-34: A1.1
- 35-49: A1.2
- 50-59: A2.1
- 60-69: A2.2
- 70-79: B1.1
- >=80: B1.2
