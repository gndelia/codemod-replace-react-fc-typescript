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

## How to use

1- Install jscodeshift

```
npm install -g jscodeshift
```

2- TBD the command to run

## Notes

The codemod focuses in replacing the nodes but does not do styling. You might want to run Prettier or your favorite formatting tool after the code has been modified.