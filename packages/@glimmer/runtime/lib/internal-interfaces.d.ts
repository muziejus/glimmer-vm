import { Unique, RuntimeResolver as IResolver } from '@glimmer/interfaces';
import { CompilationOptions as ICompilationOptions } from './environment';

export {
  InternalComponent as Component,
  ComponentDefinitionState,
  InternalComponentManager as ComponentManager,
} from './component/interfaces';

export {
  InternalModifierManager as ModifierManager,
  ModifierInstanceState as Modifier,
} from './modifier/interfaces';
