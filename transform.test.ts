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
      import React from 'react';

      const MyComponent: React.FunctionComponent = () => {
        return <span>foo</span>
      }`,
    output: `
      import React from 'react';

      const MyComponent = () => {
        return <span>foo</span>
      }`,
  },
  {
    input: `
      import React from 'react';

      type Props = { id: number };
      const MyComponent: React.FunctionComponent<Props> = (props) => {
        return <span>{props.id}</span>
      }`,
    output: `
      import React from 'react';

      type Props = { id: number };
      const MyComponent = (props: Props) => {
        return <span>{props.id}</span>
      }`,
  },
  {
    input: `
      import React from 'react';

      type Props2 = { id: number };
      const MyComponent: React.FunctionComponent<Props2> = ({ id }) => {
        return <span>{id}</span>
      }`,
    output: `
      import React from 'react';

      type Props2 = { id: number };
      const MyComponent = (
        {
          id
        }: Props2
      ) => {
        return <span>{id}</span>
      }`,
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
  {
    input: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld: React.FC<Props> = function HelloWorld({ someValue }) {
      return <div>Hi {someValue}</div>
    }
    `,
    output: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld = function HelloWorld( { someValue }: Props ) {
      return <div>Hi {someValue}</div>
    }
    `,
  },
  {
    input: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld: React.SFC<Props> = function HelloWorld({ someValue }) {
      return <div>Hi {someValue}</div>
    }
    `,
    output: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld = function HelloWorld( { someValue }: Props ) {
      return <div>Hi {someValue}</div>
    }
    `,
  },
  {
    input: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld: React.SFC<Props> = function HelloWorld(props) {
      return <div>Hi {props.someValue}</div>
    }
    `,
    output: `
    import React from 'react'

    interface Props { text: string }
    const HelloWorld = function HelloWorld(props: Props) {
      return <div>Hi {props.someValue}</div>
    }
    `,
  },
  {
    input: `
    import React from 'react'

    type Props1 = { id: number }
    const MultipleProps: React.FC<Props1 & { text?: string }> = function MultipleProps({ id, ...restProps }) {
      return (
        <span>foo</span>
      )
    }
    `,
    output: `
    import React from 'react'

    type Props1 = { id: number }
    const MultipleProps = function MultipleProps( { id, ...restProps }: Props1 & { text?: string } ) {
      return (
        <span>foo</span>
      )
    }
    `,
  },
  {
    input: `
    import React from 'react'

    const NoPropsComponent: React.FC<UnusedProps> = () => <span>foo</span>
    `,
    output: `
    import React from 'react'

    const NoPropsComponent = () => <span>foo</span>
    `,
  },
  {
    input: `
    import React, { FC } from 'react'

    const NamedExportComponent: FC = () => <span>foo</span>
    `,
    output: `
    import React, { FC } from 'react'

    const NamedExportComponent = () => <span>foo</span>
    `,
  },
  {
    input: `
    import React, { FC } from 'react'

    const NamedExportComponent: FC<Props> = (props) => <span>foo</span>
    `,
    output: `
    import React, { FC } from 'react'

    const NamedExportComponent = (props: Props) => <span>foo</span>
    `,
  },
  {
    input: `
    import React, { FC } from 'react'

    const NamedExportComponent: FC<{ text?: string }> = ({ text = '' }) => <span>{text}</span>
    `,
    output: `
    import React, { FC } from 'react'

    const NamedExportComponent = ( { text = '' }: { text?: string } ) => <span>{text}</span>
    `,
  },
  {
    input: `
    import React, { FC } from 'react'
    interface Props {
      text?: string
    }
    const NamedExportComponent: FC<Props> = ({ text = '' }) => <span>{text}</span>
    `,
    output: `
    import React, { FC } from 'react'
    interface Props {
      text?: string
    }
    const NamedExportComponent = ( { text = '' }: Props ) => <span>{text}</span>
    `,
  },
  {
    input: `
    import React, { SFC } from 'react'

    const NamedExportComponent: SFC<Props> = (props) => <span>foo</span>
    `,
    output: `
    import React, { SFC } from 'react'

    const NamedExportComponent = (props: Props) => <span>foo</span>
    `,
  },
  {
    input: `
    import React, { SFC } from 'react'

    type Props1 = { id: number }
    const MultipleProps: SFC<Props1 & { text?: string }> = function MultipleProps({ id, ...restProps }) {
      return (
        <span>foo</span>
      )
    }
    `,
    output: `
    import React, { SFC } from 'react'

    type Props1 = { id: number }
    const MultipleProps = function MultipleProps( { id, ...restProps }: Props1 & { text?: string } ) {
      return (
        <span>foo</span>
      )
    }
    `,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent: React.FC = observer(() => {
        return <span>foo</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent = observer(() => {
        return <span>foo</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent: React.FC<Props> = observer((props) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent = observer((props: Props) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent: React.FC<Props2> = observer(({ id }) => {
        return <span>{id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent = observer((
        {
          id
        }: Props2
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent: React.FunctionComponent = observer(() => {
        return <span>foo</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent = observer(() => {
        return <span>foo</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent: React.FunctionComponent<Props> = observer((props) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent = observer((props: Props) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent: React.FunctionComponent<Props2> = observer(({ id }) => {
        return <span>{id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent = observer((
        {
          id
        }: Props2
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent: React.SFC = observer(() => {
        return <span>foo</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      const MyComponent = observer(() => {
        return <span>foo</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent: React.SFC<Props> = observer((props) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent = observer((props: Props) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent: React.SFC<Props2> = observer(({ id }) => {
        return <span>{id}</span>
      })`,
    output: `
      import React from 'react';
      import { observer } from "mobx-react-lite";

      type Props2 = { id: number };
      const MyComponent = observer((
        {
          id
        }: Props2
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import { FC, forwardRef } from 'react';

      const MyComponent: FC = forwardRef((ref) => {
        return <span>foo</span>
      })`,
    output: `
      import { FC, forwardRef } from 'react';

      const MyComponent = forwardRef((ref) => {
        return <span>foo</span>
      })`,
  },
  {
    input: `
      import { FC, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent: FC<Props> = forwardRef((props, ref) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import { FC, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent = forwardRef((props: Props, ref) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import { FC, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent: FC<Props2> = forwardRef(({ id }, ref) => {
        return <span>{id}</span>
      })`,
    output: `
      import { FC, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent = forwardRef((
        {
          id
        }: Props2,
        ref
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import { FC, forwardRef } from 'react';

      const MyComponent: FC = forwardRef((ref) => {
        return <span>foo</span>
      })`,
    output: `
      import { FC, forwardRef } from 'react';

      const MyComponent = forwardRef((ref) => {
        return <span>foo</span>
      })`,
  },
  {
    input: `
      import { FunctionComponent, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent: FunctionComponent<Props> = forwardRef((props, ref) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import { FunctionComponent, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent = forwardRef((props: Props, ref) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import { FunctionComponent, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent: FunctionComponent<Props2> = forwardRef(({ id }, ref) => {
        return <span>{id}</span>
      })`,
    output: `
      import { FunctionComponent, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent = forwardRef((
        {
          id
        }: Props2,
        ref
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import { SFC, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent: SFC<Props> = forwardRef((props, ref) => {
        return <span>{props.id}</span>
      })`,
    output: `
      import { SFC, forwardRef } from 'react';

      type Props = { id: number };
      const MyComponent = forwardRef((props: Props, ref) => {
        return <span>{props.id}</span>
      })`,
  },
  {
    input: `
      import { SFC, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent: SFC<Props2> = forwardRef(({ id }, ref) => {
        return <span>{id}</span>
      })`,
    output: `
      import { SFC, forwardRef } from 'react';

      type Props2 = { id: number };
      const MyComponent = forwardRef((
        {
          id
        }: Props2,
        ref
      ) => {
        return <span>{id}</span>
      })`,
  },
  {
    input: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      export const MyComponent: {
        (): JSX.Element;
        OtherComponent: typeof OtherComponent;
      } = () => <span>foo</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: null,
  },
  {
    input: `
      import React from 'react'
      import { OtherComponent } from "./other-component";
      interface Props {
        text: string;
      }
      export const MyComponent: React.FC<Props> & {
        OtherComponent: typeof OtherComponent;
      } = (props) => <span>{props.text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: `
      import React from 'react'
      import { OtherComponent } from "./other-component";
      interface Props {
        text: string;
      }
      export const MyComponent = (props: Props) => <span>{props.text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
  },
  {
    input: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent: React.FC<Props> & {
        OtherComponent: typeof OtherComponent;
      } = ({ text }) => <span>{text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent = ( { text }: Props ) => <span>{text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
  },
  {
    input: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent: React.FunctionComponent<Props> & {
        OtherComponent: typeof OtherComponent;
      } = (props) => <span>{props.text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent = (props: Props) => <span>{props.text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
  },
  {
    input: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent: React.SFC<Props> & {
        OtherComponent: typeof OtherComponent;
      } = ({ text }) => <span>{text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: `
      import React from 'react'
      import { OtherComponent } from "./other-component";

      type Props = { id: number };
      export const MyComponent = ( { text }: Props ) => <span>{text}</span>;
      MyComponent.OtherComponent = OtherComponent;
    `,
  },
  {
    input: `
      import React from 'react';
      import { OtherComponent } from "./other-component";
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent: React.FC<Props> & {
        OtherComponent: typeof OtherComponent;
      } = observer((props) => {
        return <span>{props.id}</span>
      })
      MyComponent.OtherComponent = OtherComponent;
    `,
    output: `
      import React from 'react';
      import { OtherComponent } from "./other-component";
      import { observer } from "mobx-react-lite";

      type Props = { id: number };
      const MyComponent = observer((props: Props) => {
        return <span>{props.id}</span>
      })
      MyComponent.OtherComponent = OtherComponent;
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
