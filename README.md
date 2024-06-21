# Getting Started
- The root directory should contain only files related to the maintenance of this repo.
- Pipeline root files are stored in `/ado`
- Scripts belong in `/scripts`

# In the name of all that is wholy, scripts should be...
- OS agnostic (where ever possible)
- Portable
- Zero dependency (scope: this repo)
- Ready to run _without_ transpiling

# Linting
For the sake of legibility by all, a linter has been added to the `pre-commit` hook.

# Specifics
## scripts/*
For development
```
npm ci
cp scripts/.env.example scripts/.env
```
Note that you will need to put in a PAT token in the .env file as well as potentially adjust based on what env you wish to test against.

## scripts/ado-api.mjs
You can execute a test runner against the majority of the api calls via test/ado-api-test.mjs. 
eg: `cd scripts && node -r dotenv/config ./test/ado-api-test.mjs 2097350 3916919 3871151 2922 Project_sprint_carry_forward`
