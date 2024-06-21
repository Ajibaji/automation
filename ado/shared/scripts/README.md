# Intro
These are scripts that can be called in the ado pipeline

# Depedencies
There should be 0 dependencies in order to run in the pipeline without adding complexity

# Local development
It should be possible to run these scripts locally for testing updates. 

# Dotenv
In many cases its desirable to have the configuration set in the .env file. The .env.example file should be used as a template
for any cases used. .env should NOT be commited to the codebase
```
cp scripts/.env.example scripts/.env
```

Dotenv can then be preloaded in the command line. Eg: `node -r dotenv/config file.mjs`

# Script specifics
## ado-api.mjs / tag-build-workitem.mjs
Note that you will need to put in a PAT token in the .env file as well as potentially adjust based on what env you wish to test against.

