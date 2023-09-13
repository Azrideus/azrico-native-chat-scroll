import React from 'react';

export type sizeResult = { height: number; width: number };
export function useSize(ref: any): sizeResult {
	const [size, setSize] = React.useState<sizeResult>({
		height: 0,
		width: 0,
	});

	const onResize = React.useCallback(() => {
		if (!ref) {
			return;
		}

		const newHeight = ref.current.offsetHeight;
		const newWidth = ref.current.offsetWidth;

		if (newHeight !== size.height || newWidth !== size.width) {
			setSize({
				height: newHeight,
				width: newWidth,
			});
		}
	}, [size.height, size.width]);

	React.useLayoutEffect(() => {
		if (!ref || !ref.current) {
			return;
		}

		const resizeObserver = new ResizeObserver(onResize);
		resizeObserver.observe(ref.current);

		return () => resizeObserver.disconnect();
	}, [ref.current, onResize]);

	return size;
}

/**
 * retruns distance of bottom of screen to bottom of scroller
 * @param inner
 * @param outer
 * @returns
 */
export function currentDistanceToBottom(inner: HTMLElement, outer: HTMLElement) {
	return inner.offsetHeight - outer.scrollTop - outer.offsetHeight;
}
