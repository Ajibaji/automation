module.exports = {
	env: {
		es2021: true,
		node: true
	},
	extends: 'eslint:recommended',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module'
	},
	rules: {
		indent: [
			'error',
			'tab'
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		quotes: [
			'error',
			'single'
		],
		semi: [
			'error',
			'never'
		],
    'array-bracket-spacing': [
      'error',
      'always',
      {
        arraysInArrays: true,
        objectsInArrays: true,
        singleValue: true,
      }
    ],
    'block-spacing': [
      'warn',
      'always'
    ],
    'brace-style': [
      'error',
      '1tbs'
    ],
    'comma-dangle': [
      'error',
      'always-multiline'
    ],
    'computed-property-spacing': [
      'warn',
      'never'
    ],
    curly: 'error',
    'default-case': 'warn',
    'eol-last': [
      'warn',
      'always'
    ],
    'key-spacing': [
      'error',
      {
        afterColon: true,
        beforeColon: false,
        mode: 'strict',
      }
    ],
    'keyword-spacing': [
      'warn',
      {
        after: true,
        before: true,
      }
    ],
    'object-curly-spacing': [
      'warn',
      'always',
      {
        arraysInObjects: true,
        objectsInObjects: true,
      }
    ],
    'no-empty': 'warn',
    'no-extra-semi': 'error',
    'no-new': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    "sort-imports": [
      "error",
      {
        "ignoreCase": false,
        "ignoreDeclarationSort": true,
        "ignoreMemberSort": false,
        "allowSeparatedGroups": false
      },
    ],
    'sort-vars': [
      'warn',
      {
        ignoreCase: false,
      }
    ],
    'space-before-blocks': [
      'warn',
      'always'
    ],
    'space-in-parens': [
      'warn',
      'never'
    ]
	}
}
