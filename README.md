# codemod-replace-react-fc-typescript

A codemod using [jscodeshift](https://github.com/facebook/jscodeshift) to remove `React.FC` and `React.SFC` from your codebase

## Motivation

IF you use React and Typescript, you might have come across this [GitHub PR in Create React App's repo](https://github.com/facebook/create-react-app/pull/8177) about removing `React.FC` from their base template of a Typescript project.

The three main points that made me buy this was the fact that:

- There's an implicit definition of `children` - all your components will have `children` typed!
- They don't support generics
- It does not correctly work with `defaultProps`

as well as other downsides (check out the PR description for that)

Motivated by that PR, and a lot of blog posts who also shared similar conclusions (and this [ADR](https://backstage.io/docs/architecture-decisions/adrs-adr006) from Spotify's team in which they recorded the decision of removing `React.FC` from they codebase too), I wrote this little codemod that drops `React.FC` and `React.SFC` (which was also deprecated) and replaces the Props as the type of the unique argument in the component definition.

Let's see it with code

```tsx
// before codemod runs
type Props2 = { id: number };
export const MyComponent2: React.FC<Props2> = (props) => {
  return <span>{props.id}</span>
}

// after codemod runs
type Props2 = { id: number };
export const MyComponent2 = (props: Props2) => {
  return <span>{props.id}</span>
}

```

It also works if the Props are defined inline

```tsx
// before codemod runs
export const MyComponent4: React.FC<{ inlineProp: number, disabled?: boolean }> = (props) => <span>foo</span>

// after codemod runs
export const MyComponent4 = (
  props: {
    inlineProp: number,
    disabled?: boolean
  }
) => <span>foo</span>
```

It works with generics too!

```tsx
// before codemod runs
type GenericsProps<T extends any> = { config: T }
export const MyComponentWithGenerics: React.FC<GenericsProps<string>> = (props) => <span>{props.config}</span>
export const MyComponentWithGenerics2: React.FC<GenericsProps<{ text: string }>> = ({ config: { text }}) => <span>{text}</span>

// after codemod runs
type GenericsProps<T extends any> = { config: T }
export const MyComponentWithGenerics = (props: GenericsProps<string>) => <span>{props.config}</span>
export const MyComponentWithGenerics2 = (
  {
    config: { text }
  }: GenericsProps<{ text: string }>
) => <span>{text}</span>
```

and with props defined with intersection

```tsx
// before codemod runs
const WithIntersection: React.FC<Props1 & Props2> = ({ id, ...restProps }) => <span>{id}</span>

// after codemod runs
const WithIntersection = ( { id, ...restProps }: Props1 & Props2 ) => <span>{id}</span>
```

Even with no Props!

```tsx
// before codemod runs
const NoPropsComponent: React.FC = () => <span>foo</span>

// after codemod runs
const NoPropsComponent = () => <span>foo</span>
```

You don't have to stick with arrow functions only; all the previous scenarios work with regular named functions as well

```tsx
// before codemod runs
import React from 'react'

interface Props { text: string }
const HelloWorld: React.SFC<Props> = function HelloWorld(props) {
  return <div>Hi {props.someValue}</div>
}

// after codemod runs
import React from 'react'

interface Props { text: string }
const HelloWorld = function HelloWorld(props: Props) {
  return <div>Hi {props.someValue}</div>
}
```

## How to use

1- Install jscodeshift

```
npm install -g jscodeshift
```

2- Run the following command

```
jscodeshift -t https://raw.githubusercontent.com/gndelia/codemod-replace-react-fc-typescript/main/dist/index.js --extensions=tsx --verbose=2 <FOLDER-YOU-WANT-TO-TRANSFORM>
```

There are other options you can read in the jscodeshift's Readme.

`jscodeshift` only accepts local transform files, or remote self-contained files. That's why I compiled the transform file into one distributable file using [@vercel/ncc](https://github.com/vercel/ncc). If you don't want to run this remote file (because you might not trust, although you can read the source - it is totally safe), you can download this repo and run 

```
jscodeshift -t Path/To/Repo/transform.ts --extensions=tsx --verbose=2 <FOLDER-YOU-WANT-TO-TRANSFORM>
```

## Notes

- The codemod focuses in replacing the nodes but does not do styling. You might want to run Prettier or your favorite formatting tool after the code has been modified. For example, in the following code

```tsx
import React from 'react'

interface Props { id: number, text: string }
const Component: React.FC<Props> = (props) => (
  <div>
    <span>{props.id}</span>
  </div>
)
```

after running the codemod, you might lose the parenthesis

```tsx
import React from 'react'

interface Props { id: number, text: string }
const Component = (props: Props) => <div>
  <span>{props.id}</span>
</div>
```

this is because those parenthesis are not strictly required for the code to work. You can fix this by running `Prettier` (or whatever tool you're using to format your code) easily, as the code is still valid



- If your component was using the implicit definition of `children` provided by `React.FC`, you will have to add the explicit definition or the code won't compile. For example, the following code

```tsx
import React from 'react'

type Props = { title: string }
const Component: React.FC<Props> = ({ title, children }) => <div title={title}>{children}</div>
```

will be transformed into this after running the codemod
```tsx
import React from 'react'

type Props = { title: string }
const Component = ({ title, children }: Props) => <div title={title}>{children}</div>
```

However, it won't compile because `children` is not part of your `Props` definition anymore. You can solve this by manually adding the type of `children` again.


The value that `React.FC` provides (that accepts anything you would accept in js as children) is `{ children?: ReactNode }`. I'm intentionally not automatically adding it because  you can restrict it to what you only want to accept (for instance, just a string, a number, only one component, and so on), and you know better than I do what you need.