/**
 * Mobile bottom-sheet primitive with drag-to-dismiss (#314).
 *
 * Built on Radix Dialog so the panel inherits the focus trap, escape
 * handling, and `role="dialog"` semantics the rest of the app already
 * relies on — drag is a *progressive enhancement* on top of those
 * affordances:
 *
 *  - The close button (`<BottomSheetClose />`) always works, on every
 *    input device, and is the primary dismissal affordance for
 *    keyboard / screen-reader users.
 *  - Dragging the panel downward past `dismissThresholdPx` (default
 *    96px) closes the sheet — matching iOS/Android platform
 *    conventions for mobile-first surfaces.
 *  - The drag handle (`<BottomSheetHandle />`) is exposed as a separate
 *    component so callers can place it inside their sheet content
 *    rather than baking it into a fixed layout. It is a visual hint;
 *    the gesture is captured on the sheet's content surface.
 *  - Scrollable content inside the sheet is unaffected: drag is
 *    captured only when the gesture starts on the handle or when the
 *    inner scroller is already at scrollTop 0 *and* the gesture moves
 *    downward — preventing the "trying to scroll up" misfire.
 *
 * The component uses native pointer events so we don't pull a gesture
 * library purely for one interaction; framer-motion is available in
 * the bundle but not required here.
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pixels of downward travel required to commit a dismissal. */
const DEFAULT_DISMISS_THRESHOLD_PX = 96;

interface BottomSheetGestureContextValue {
	registerHandle: (node: HTMLElement | null) => void;
}

const BottomSheetGestureContext =
	React.createContext<BottomSheetGestureContextValue | null>(null);

export type BottomSheetProps = React.ComponentProps<typeof DialogPrimitive.Root>;

export const BottomSheet = ({ ...props }: BottomSheetProps) => (
	<DialogPrimitive.Root data-slot="bottom-sheet" {...props} />
);

export const BottomSheetTrigger = DialogPrimitive.Trigger;
export const BottomSheetClose = DialogPrimitive.Close;
export const BottomSheetPortal = DialogPrimitive.Portal;

export interface BottomSheetContentProps
	extends React.ComponentProps<typeof DialogPrimitive.Content> {
	/** Distance in px to drag downward before dismissal commits. */
	dismissThresholdPx?: number;
	/**
	 * When `false`, dragging is disabled entirely — the sheet falls
	 * back to close-button-only dismissal. Useful for tests and for
	 * surfaces where the inner content has its own gesture handlers.
	 */
	enableDrag?: boolean;
	/** Hide the default close button (callers can render their own). */
	hideCloseButton?: boolean;
}

export const BottomSheetContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	BottomSheetContentProps
>(
	(
		{
			className,
			children,
			dismissThresholdPx = DEFAULT_DISMISS_THRESHOLD_PX,
			enableDrag = true,
			hideCloseButton = false,
			onPointerDown,
			...props
		},
		ref
	) => {
		const internalRef = React.useRef<HTMLDivElement | null>(null);
		const setRefs = React.useCallback(
			(node: HTMLDivElement | null) => {
				internalRef.current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					(ref as React.MutableRefObject<HTMLDivElement | null>).current =
						node;
				}
			},
			[ref]
		);

		// Captured pointer state — null when no drag is active.
		const dragStateRef = React.useRef<{
			pointerId: number;
			startY: number;
			startedOnHandle: boolean;
		} | null>(null);
		const handleRef = React.useRef<HTMLElement | null>(null);

		const registerHandle = React.useCallback(
			(node: HTMLElement | null) => {
				handleRef.current = node;
			},
			[]
		);

		const resetTransform = React.useCallback(() => {
			const node = internalRef.current;
			if (!node) return;
			node.style.transform = "";
			node.style.transition = "transform 180ms ease-out";
			// Drop the transition after it finishes so subsequent gestures
			// start clean.
			window.setTimeout(() => {
				if (node) node.style.transition = "";
			}, 200);
		}, []);

		const dismiss = React.useCallback(() => {
			// Close the sheet by dispatching Escape — that lets Radix run
			// its `onOpenChange(false)` and cleanup pipeline rather than us
			// bypassing it.
			internalRef.current?.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
			);
		}, []);

		const isGestureStartAllowed = React.useCallback(
			(target: EventTarget | null): boolean => {
				if (!enableDrag) return false;
				const node = internalRef.current;
				if (!node) return false;
				const targetEl = target as HTMLElement | null;
				// Always allow when the gesture starts on the registered
				// handle — it's the "I'm grabbing the sheet" affordance.
				if (handleRef.current && targetEl && handleRef.current.contains(targetEl)) {
					return true;
				}
				// Otherwise only allow when no inner scroller is engaged:
				// look at the nearest ancestor that is scrolling and bail
				// out if its `scrollTop > 0`. This avoids stealing the
				// downward-pull-to-scroll-up gesture.
				let cursor: HTMLElement | null = targetEl;
				while (cursor && cursor !== node) {
					if (
						cursor.scrollHeight > cursor.clientHeight &&
						cursor.scrollTop > 0
					) {
						return false;
					}
					cursor = cursor.parentElement;
				}
				return true;
			},
			[enableDrag]
		);

		const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
			onPointerDown?.(event);
			if (event.defaultPrevented) return;
			if (event.button !== undefined && event.button !== 0) return;
			if (!isGestureStartAllowed(event.target)) return;

			const node = internalRef.current;
			if (!node) return;

			const startedOnHandle = !!(
				handleRef.current &&
				event.target instanceof HTMLElement &&
				handleRef.current.contains(event.target)
			);
			dragStateRef.current = {
				pointerId: event.pointerId,
				startY: event.clientY,
				startedOnHandle,
			};
			try {
				node.setPointerCapture(event.pointerId);
			} catch {
				/* JSDOM / older browsers: capture isn't required for the
				   pointermove path to still observe events. */
			}
		};

		const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
			const drag = dragStateRef.current;
			if (!drag || drag.pointerId !== event.pointerId) return;
			const dy = event.clientY - drag.startY;
			if (dy < 0) {
				// Upward drag — clamp at 0; we don't expose pull-up.
				const node = internalRef.current;
				if (node) node.style.transform = "translate3d(0, 0, 0)";
				return;
			}
			const node = internalRef.current;
			if (node) node.style.transform = `translate3d(0, ${dy}px, 0)`;
		};

		const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
			const drag = dragStateRef.current;
			if (!drag || drag.pointerId !== event.pointerId) return;
			const dy = event.clientY - drag.startY;
			dragStateRef.current = null;
			try {
				internalRef.current?.releasePointerCapture(event.pointerId);
			} catch {
				/* see handlePointerDown */
			}
			if (dy >= dismissThresholdPx) {
				dismiss();
			} else {
				resetTransform();
			}
		};

		const gestureContext = React.useMemo<BottomSheetGestureContextValue>(
			() => ({ registerHandle }),
			[registerHandle]
		);

		return (
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					data-slot="bottom-sheet-overlay"
					className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
				/>
				<BottomSheetGestureContext.Provider value={gestureContext}>
					<DialogPrimitive.Content
						ref={setRefs}
						data-slot="bottom-sheet-content"
						// Radix's Dialog.Content does not stamp aria-modal
						// itself; set it explicitly (#876) — role="dialog" and
						// the focus trap / Escape-to-dismiss / focus-restore
						// behavior are already provided by Radix.
						aria-modal="true"
						className={cn(
							"fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg touch-pan-y rounded-t-2xl border border-white/10 bg-slate-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl",
							"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8",
							className
						)}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerCancel={handlePointerUp}
						{...props}
					>
						{children}
						{!hideCloseButton && (
							<DialogPrimitive.Close
								className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
								aria-label="Close panel"
							>
								<XIcon className="size-4" aria-hidden="true" />
							</DialogPrimitive.Close>
						)}
					</DialogPrimitive.Content>
				</BottomSheetGestureContext.Provider>
			</DialogPrimitive.Portal>
		);
	}
);
BottomSheetContent.displayName = "BottomSheetContent";

/**
 * Visual drag handle. Renders a small horizontal pill and registers
 * itself with the parent `BottomSheetContent` so a gesture that starts
 * inside the handle is always treated as "user grabbed the sheet"
 * regardless of what's underneath.
 */
export const BottomSheetHandle: React.FC<{ className?: string }> = ({
	className,
}) => {
	const ctx = React.useContext(BottomSheetGestureContext);
	const ref = React.useRef<HTMLDivElement | null>(null);
	React.useEffect(() => {
		ctx?.registerHandle(ref.current);
		return () => ctx?.registerHandle(null);
	}, [ctx]);
	return (
		<div
			ref={ref}
			role="presentation"
			data-testid="bottom-sheet-handle"
			className={cn(
				"mx-auto mb-3 h-1.5 w-12 cursor-grab rounded-full bg-white/25 active:cursor-grabbing",
				className
			)}
		/>
	);
};

export const BottomSheetTitle = DialogPrimitive.Title;
export const BottomSheetDescription = DialogPrimitive.Description;
