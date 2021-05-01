# Zaman Statistics Generator

Generate time statistics based on a set of punch clock entries.

## Installation

With NPM:

```
npm install zaman-statistics-generator
```

With Yarn:

```
yarn add zaman-statistics-generator
```

## Usage

The module exports a method called `compute` that accepts two arguments:

  - the set of objects containing the punch clock entries (array, required);
  - the work shift to consider in the process (integer, optional, defaulting to 8).

### Example

The first argument is an array of objects, each containing the date and the punches. It should be in the following format:

```
import { compute } from 'zaman-statistics-generator'

const punches = [
  { date: '2021-10-01', punches: ['09:00', '12:00', '13:00', '18:00'] }
]
const statistics = compute(punches)
```