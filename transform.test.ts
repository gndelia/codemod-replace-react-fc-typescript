import { withParser } from 'jscodeshift'
import transform from './transform'

type TestCase = { input: string; output: string | null }
const testCases: TestCase[] = [
  {
    input: "import React from 'react'",
    output: null,
  },
  {
    input: `
      import React from 'react'
      type Props = { id: number };
      const MyComponent = (props: Props) => {
        return <span>{props.id}</span>
      }`,
    output: null,
  },
  {
    input: `
      import React from 'react'

      type Props = { id: number };
      const MyComponent: React.SFC<Props> = (props) => {
        return <span>{props.id}</span>
      }`,
    output: `
      import React from 'react'

      type Props = { id: number };
      const MyComponent = (props: Props) => {
        return <span>{props.id}</span>
      }`,
  },
  {
    input: `
      import React from 'react'

      type Props2 = { id: number };
      export const MyComponent2: React.FC<Props2> = (props) => {
        return <span>{props.id}</span>
      }
    `,
    output: `
      import React from 'react'

      type Props2 = { id: number };
      export const MyComponent2 = (props: Props2) => {
        return <span>{props.id}</span>
      }
    `,
  },
  {
    input: `
    import React from 'react'

    type MyAwesomeProps = { text: string };
    export const MyComponent3: React.SFC<MyAwesomeProps> = ({ text }) => {
      return <span>{text}</span>
    }
    `,
    output: `
    import React from 'react'

    type MyAwesomeProps = { text: string };
    export const MyComponent3 = (
      {
        text
      }: MyAwesomeProps
    ) => {
      return <span>{text}</span>
    }
    `,
  },
  {
    input: `
      import React from 'react'

      export const MyComponent4: React.FC<{ inlineProp: number, disabled?: boolean }> = (props) => <span>{\`\${props.inlineProp}-\${props.disabled}\`}</span>
    `,
    output: `
      import React from 'react'

      export const MyComponent4 = (
        props: {
          inlineProp: number,
          disabled?: boolean
        }
      ) => <span>{\`\${props.inlineProp}-\${props.disabled}\`}</span>
    `,
  },
  {
    input: `
      import React from 'react'

      export const MyComponent5: React.SFC<{ prop1: number, id: number }> = ({ id, prop1 }) => <span>{\`\${prop1}-\${id}\`}</span>
    `,
    output: `
      import React from 'react'

      export const MyComponent5 = (
        {
          id,
          prop1
        }: {
          prop1: number,
          id: number
        }
      ) => <span>{\`\${prop1}-\${id}\`}</span>
    `,
  },
  {
    input: `
    import React from 'react'

    type GenericsProps<T extends any> = { config: T }
    export const MyComponentWithGenerics: React.FC<GenericsProps<string>> = (props) => <span>text</span>
    export const MyComponentWithGenerics2: React.FC<GenericsProps<{ text: string }>> = ({ config: { text }}) => <span>{text}</span>
    `,
    output: `
    import React from 'react'

    type GenericsProps<T extends any> = { config: T }
    export const MyComponentWithGenerics = (props: GenericsProps<string>) => <span>text</span>
    export const MyComponentWithGenerics2 = (
      {
        config: { text }
      }: GenericsProps<{ text: string }>
    ) => <span>{text}</span>
    `,
  },
  {
    input: `
    import React from 'react'

    const NoPropsComponent: React.FC = () => <span>foo</span>
    `,
    output: `
    import React from 'react'

    const NoPropsComponent = () => <span>foo</span>
    `,
  },
  {
    input: `
    import React from 'react'

    type Props = { id: number, disabled: boolean }
    const WithRestProps: React.FC<Props> = ({ id, ...restProps }) => <span>{id}</span>
    `,
    output: `
    import React from 'react'

    type Props = { id: number, disabled: boolean }
    const WithRestProps = ( { id, ...restProps }: Props ) => <span>{id}</span>
    `,
  },
  {
    input: `
    import React from 'react'
    import { RouterProps } from 'router-library'

    type Props1 = { id: number }
    type Props2 = { text?: string }
    const MultipleProps: React.FC<Props1 & Props2 & RouterProps> = ({ id, ...restProps }) => <span>foo</span>
    `,
    output: `
    import React from 'react'
    import { RouterProps } from 'router-library'

    type Props1 = { id: number }
    type Props2 = { text?: string }
    const MultipleProps = ( { id, ...restProps }: Props1 & Props2 & RouterProps ) => <span>foo</span>
    `,
  },
  {
    input: `
    import React from 'react'

    type Props1 = { id: number }
    const MultipleProps: React.FC<Props1 & { text?: string }> = ({ id, ...restProps }) => <span>foo</span>
    `,
    output: `
    import React from 'react'

    type Props1 = { id: number }
    const MultipleProps = ( { id, ...restProps }: Props1 & { text?: string } ) => <span>foo</span>
    `,
  },
  {
    input: `
    import React from 'react'

    interface Props { id: number, text: string }
    const Component: React.FC<Props> = (props) => (
      <div>
        <span>{props.id}</span>
      </div>
    )
    `,
    output: `
    import React from 'react'

    interface Props { id: number, text: string }
    const Component = (props: Props) => <div>
      <span>{props.id}</span>
    </div>
    `,
  },
]

function escapeLineEndingsAndMultiWhiteSpaces(text: string | null | undefined) {
  return text
    ?.replace(/(?:\\[rn]|[\r\n]+)+/g, '')
    ?.replace(/  +/g, ' ')
    ?.trim()
}

testCases.forEach(({ input, output }, index) => {
  describe(`Given scenario number ${index}`, () => {
    it(output ? 'should apply the transform correctly' : 'should return null and apply no changes', () => {
      const j = withParser('tsx')
      const result = transform(
        { source: input, path: '' },
        { j, jscodeshift: j, stats: jest.fn(), report: jest.fn() }
      )?.trim()
      // console.log(JSON.stringify(result))
      // console.log(JSON.stringify(output))
      expect(escapeLineEndingsAndMultiWhiteSpaces(result)).toBe(escapeLineEndingsAndMultiWhiteSpaces(output))
    })
  })
})
