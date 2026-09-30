/** Avoid the Next overlay in dev when the phone DOM / HMR gets out of sync. */
export function patchReactDomDevGuards() {
  if (process.env.NODE_ENV === "production") return;
  if (typeof Node === "undefined") return;
  const proto = Node.prototype;
  const flagged = proto as Node & { __padellabDomGuard?: boolean };
  if (flagged.__padellabDomGuard) return;
  flagged.__padellabDomGuard = true;

  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };

  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) {
      return this.appendChild(node) as T;
    }
    return insertBefore.call(this, node, ref) as T;
  };
}
