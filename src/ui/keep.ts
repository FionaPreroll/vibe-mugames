/**
 * Elements that stay while the screen around them is drawn anew, such as a text field a player
 * types in, or the paper someone draws on: the screens draw everything again whenever the table
 * changes, many times a second, and a text field taken out of the page loses what the keyboard
 * was doing, and closes it.
 *
 * A view puts `keptPlace(element)` where the element goes; `replaceKeeping` then draws the new
 * screen around elements already on it, without taking them out: the elements that hold one stay
 * too, with the new ones' attributes, and only their other children are new.
 */

/** Each place, and the element that goes there. */
const PLACES = new WeakMap<Element, HTMLElement>()
/** Every element kept. */
const KEPT = new WeakSet<Element>()

/** Where a kept element goes, in a view being built: the element itself stays where it is. */
export function keptPlace(element: HTMLElement): HTMLElement {
  const place = document.createElement('span')
  place.className = 'kept-place'
  PLACES.set(place, element)
  KEPT.add(element)
  return place
}

/** Puts `nodes` in place of `parent`'s children, keeping the kept elements in the page. */
export function replaceKeeping(parent: Element, nodes: readonly Node[]): void {
  patch(parent, nodes)
}

/** The kept element of a place, if `node` is one. */
function keptOf(node: Node): HTMLElement | undefined {
  return node instanceof Element ? PLACES.get(node) : undefined
}

/** The places inside a new element. */
function placesIn(node: Element): HTMLElement[] {
  return [...node.querySelectorAll('.kept-place')].flatMap((place) => {
    const element = PLACES.get(place)
    return element ? [element] : []
  })
}

function patch(old: Element, fresh: readonly Node[]): void {
  /** The old child that stays in place of a new one: a kept element, or one that holds one. */
  const stays = new Map<Node, Node>()
  const used = new Set<Node>()
  for (const node of fresh) {
    const own = keptOf(node)
    if (own) {
      if (own.parentNode === old) {
        stays.set(node, own)
        used.add(own)
      }
      continue
    }
    if (!(node instanceof Element)) continue
    for (const element of placesIn(node)) {
      if (!old.contains(element) || element === old) continue
      let child: Node = element
      while (child.parentNode && child.parentNode !== old) child = child.parentNode
      if (
        child instanceof Element &&
        child.tagName === node.tagName &&
        !used.has(child) &&
        !KEPT.has(child)
      ) {
        stays.set(node, child)
        used.add(child)
      }
      break
    }
  }
  for (const child of [...old.childNodes]) if (!used.has(child)) old.removeChild(child)
  let next: Node | null = old.firstChild
  for (const node of fresh) {
    const kept = keptOf(node)
    const target = stays.get(node) ?? kept ?? node
    if (target !== node && !kept && node instanceof Element && target instanceof Element) {
      sync(target, node)
      patch(target, [...node.childNodes])
    } else if (!kept && node instanceof Element) fill(node)
    if (target === next) next = next.nextSibling
    else old.insertBefore(target, next)
  }
}

/** Puts the kept elements into the places of a new element, which is not on the page yet. */
function fill(node: Element): void {
  for (const place of [...node.querySelectorAll('.kept-place')]) {
    const element = PLACES.get(place)
    if (element) place.replaceWith(element)
  }
}

/** Gives an element that stays the attributes of the new one in its place. */
function sync(old: Element, fresh: Element): void {
  for (const { name } of [...old.attributes]) {
    if (!fresh.hasAttribute(name)) old.removeAttribute(name)
  }
  for (const { name, value } of [...fresh.attributes]) {
    if (old.getAttribute(name) !== value) old.setAttribute(name, value)
  }
}
