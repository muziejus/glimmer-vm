import { Opcode, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { InternedString } from 'glimmer-util';
import { ChainableReference } from 'glimmer-reference';


abstract class DOMUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class TextOpcode extends Opcode {
  public type = "text";
  public text: InternedString;

  constructor({ text }: { text: InternedString }) {
    super();
    this.text = text;
  }

  evaluate(vm: VM) {
    vm.stack().appendText(this.text);
  }
}

export class OpenPrimitiveElementOpcode extends Opcode {
  public type = "open-primitive-element";
  public tag: InternedString;

  constructor({ tag }: { tag: InternedString }) {
    super();
    this.tag = tag;
  }

  evaluate(vm: VM) {
    vm.stack().openElement(this.tag);
  }
}

export class CloseElementOpcode extends Opcode {
  public type = "close-element";

  evaluate(vm: VM) {
    let { element, classList, classNames } = vm.stack().closeElement();

    if (classList) {
      vm.updateWith(new UpdateAttributeOpcode(element, "class", classList, classNames));
    }
  }
}

export class StaticAttrOpcode extends Opcode {
  public type = "static-attr";
  public name: InternedString;
  public value: InternedString;
  public namespace: InternedString;

  constructor({ name, value, namespace }: { name: InternedString, value: InternedString, namespace: InternedString }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  evaluate(vm: VM) {
    let { name, value, namespace } = this;

    if (this.namespace) {
      vm.stack().setAttributeNS(name, value, namespace);
    } else {
      vm.stack().setAttribute(name, value);
    }
  }
}

export class DynamicAttrOpcode extends Opcode {
  public type = "dynamic-attr";
  public name: InternedString;
  public namespace: InternedString;

  constructor({ name, namespace }: { name: InternedString, namespace: InternedString }) {
    super();
    this.name = name;
    this.namespace = namespace;
  }

  evaluate(vm: VM) {
    let { name, namespace } = this;
    let reference = vm.frame.getOperand();
    let value = reference.value();

    if (this.namespace) {
      vm.stack().setAttributeNS(name, value, namespace);
    } else {
      vm.stack().setAttribute(name, value);
    }

    vm.updateWith(new UpdateAttributeOpcode(vm.stack().element, name, reference, value));
  }
}

export class UpdateAttributeOpcode extends DOMUpdatingOpcode {
  public type = "update-attribute";

  private element: Element;
  private name: string;
  private namespace: string;
  private reference: ChainableReference;
  private lastValue: string;

  constructor(element: Element, name: string, reference: ChainableReference, lastValue: string, namespace?: string) {
    super();
    this.element = element;
    this.name = name;
    this.reference = reference;
    this.lastValue = lastValue;
    this.namespace = namespace;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.reference.value();

    if (value !== this.lastValue) {
      if (this.namespace) {
        vm.dom.setAttributeNS(this.element, this.name, value, this.namespace);
      } else {
        vm.dom.setAttribute(this.element, this.name, value);
      }

      this.lastValue = value;
    }
  }
}

export class DynamicPropOpcode extends Opcode {
  public type = "dynamic-prop";
  public name: InternedString;

  constructor({ name }: { name: InternedString }) {
    super();
    this.name = name;
  }

  evaluate(vm: VM) {
    let { name } = this;
    let element = vm.stack().element;
    let reference = vm.frame.getOperand();
    let value = reference.value();

    element[<string>name] = value;

    vm.updateWith(new UpdatePropertyOpcode(element, name, reference, value));
  }
}

export class UpdatePropertyOpcode extends DOMUpdatingOpcode {
  public type = "update-property";

  private element: Element;
  private name: string;
  private reference: ChainableReference;
  private lastValue: any;

  constructor(element: Element, name: string, reference: ChainableReference, lastValue: any) {
    super();
    this.element = element;
    this.name = name;
    this.reference = reference;
    this.lastValue = lastValue;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.reference.value();

    if (value !== this.lastValue) {
      this.lastValue = this.element[this.name] = value;
    }
  }
}

export class AddClassOpcode extends Opcode {
  public type = "add-class";

  evaluate(vm: VM) {
    vm.stack().addClass(vm.frame.getOperand());
  }
}

export class CommentOpcode extends Opcode {
  public type = "comment";
  public comment: InternedString;

  constructor({ comment }: { comment: InternedString }) {
    super();
    this.comment = comment;
  }

  evaluate(vm: VM) {
    vm.stack().appendComment(this.comment);
  }
}
