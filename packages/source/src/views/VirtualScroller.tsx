import '../styles/styles.css';
import React from 'react';
import { useSize, currentDistanceToBottom, sizeResult } from '../classes/SizeHelper';

const WRAPPER_HEIGHT = 400;

const DEFAULT_BATCH_SIZE = 20;
const MAX_ITEMS = 80;

type VirtualScrollerProps = {
	newItems?: any[];
	ItemRender: React.ElementType<any>;
	WrapperContent?: React.ElementType<any>;
	BottomContent?: React.ElementType<any>;
	TopContent?: React.ElementType<any>;
	loadFunction: ({ skip, limit }) => Promise<any[]> | any[] | any;
};

/**
 * Advanced Virtual scrolling
 * @param props
 */
export function VirtualScroller(props: VirtualScrollerProps) {
	//
	const innerRef = React.useRef<HTMLDivElement>(null);
	const outerRef = React.useRef<HTMLDivElement>(null);
	const bottomElementRef = React.useRef<HTMLDivElement>(null);

	const lastLoadDirection = React.useRef<number>(0);
	const distanceToBottom = React.useRef<number>(0);

	const distanceToTop = React.useRef<number>(0);

	const lastItemCount = React.useRef<number>(0);
	const lastNewItemCount = React.useRef<number>(0);

	const loadingFlag = React.useRef<boolean>(false);

	const [maxNumberOfItems, set_maxNumberOfItems] = React.useState<number>(0);
	const [itemsMap, set_itemsMap] = React.useState<any>({});
	const [deleteMap, set_deleteMap] = React.useState<any>({});

	const [isAtBottom, set_isAtBottom] = React.useState<boolean>(true);
	const [isAtTop, set_isAtTop] = React.useState<boolean>(false);
	const [isSticky, set_isSticky] = React.useState<boolean>(false);

	const itemEntries = React.useMemo(() => {
		return Object.entries(itemsMap).sort((a, b) => Number(b[0]) - Number(a[0]));
	}, [itemsMap]);

	const newItemEntries = React.useMemo(() => {
		const newItems = props.newItems || [];
		console.log(newItems);
		return newItems.map((r, i) => [i, r]);
	}, [props.newItems]);

	React.useEffect(() => {
		/* ---------------------------- add the new items --------------------------- */

		let startingIndex = -1;
	}, [props.newItems]);

	/* ----------------------- newest item that is loaded ----------------------- */
	const currentMinIndex = React.useMemo(() => {
		if (itemEntries.length === 0) return -1;
		return Math.min(...itemEntries.map((r) => Number(r[0])));
	}, [itemEntries]);

	/* ----------------------- oldest item that is loaded ----------------------- */
	const currentMaxIndex = React.useMemo(() => {
		if (itemEntries.length === 0) return -1;
		return Math.max(...itemEntries.map((r) => Number(r[0])));
	}, [itemEntries]);

	/* --------------------- check if we are in current time -------------------- */
	React.useLayoutEffect(() => {
		const new_isAtBottom = currentMinIndex <= 0;
		const new_isAtTop = maxNumberOfItems > 0 && currentMaxIndex >= maxNumberOfItems;

		set_isAtBottom(new_isAtBottom);
		set_isAtTop(new_isAtTop);
	}, [currentMinIndex, currentMaxIndex, maxNumberOfItems]);

	/* -------------------------------------------------------------------------- */
	/*                         load new items when needed                         */
	/* -------------------------------------------------------------------------- */
	async function loadItems(direction = 0) {
		if (loadingFlag.current) return;

		try {
			loadingFlag.current = true;

			let startingIndex = 0;
			let batchSize = DEFAULT_BATCH_SIZE;
			if (direction == 1) {
				/* --------------------------- add above the list --------------------------- */
				startingIndex = currentMaxIndex + 1;
			} else {
				/* --------------------------- add below the list --------------------------- */
				if (currentMinIndex == 0) {
					console.warn('already at the end of the list');
					return;
				}
				//if we are adding items below our current items,
				// make sure to not load more items than we actually have room for
				batchSize = Math.min(batchSize, currentMinIndex);
				startingIndex = Math.max(0, currentMinIndex - batchSize);
			}

			/* -------------------------- nothing more to load -------------------------- */
			if (batchSize === 0) {
				console.warn('nothing more to load');
				return;
			}

			const loadParams = { skip: startingIndex - 1, limit: batchSize };
			const newItems = await props.loadFunction(loadParams);
			lastLoadDirection.current = direction;
			if (newItems.length < batchSize) {
				//we loaded less items than expected.
				//this can mean we have reached the top of the list
				set_maxNumberOfItems(currentMaxIndex + newItems.length);
			} else set_maxNumberOfItems(-1);

			if (newItems.length != 0) {
				const newItemsMap = {};
				for (let index = 0; index < newItems.length; index++) {
					const element = newItems[index];
					newItemsMap[startingIndex + index] = element;
				}
				const newResult = { ...itemsMap, ...newItemsMap };
				if (Object.keys(newResult).length > MAX_ITEMS) {
					//delete some items to open up room.
					const delCount = Object.keys(newResult).length - MAX_ITEMS;
					const delmap = {};
					if (direction == 1) {
						//if we recently added to TOP of list, then delete from BOTTOM
						for (
							let index = currentMinIndex;
							index < currentMinIndex + delCount;
							index++
						) {
							delmap[index] = true;
						}
					} else {
						//if we recently added to BOTTOM of list, then delete from TOP
						for (
							let index = currentMaxIndex;
							index > currentMaxIndex - delCount;
							index--
						) {
							delmap[index] = true;
						}
					}
					//these items will be deleted soon
					set_deleteMap((s) => ({ ...s, ...delmap }));
				}
				set_itemsMap(newResult);
			}
		} finally {
			loadingFlag.current = false;
		}
	}

	/* ---------------------------- scroll to bottom ---------------------------- */
	React.useLayoutEffect(() => {
		bottomElementRef.current?.scrollIntoView({});
		checkShouldLoad();
	}, [bottomElementRef.current]);

	/* -------------------------------------------------------------------------- */
	/*                               Check load page                              */
	/* -------------------------------------------------------------------------- */
	function _onScroll(e) {
		distanceToBottom.current = currentDistanceToBottom(
			innerRef.current as any,
			outerRef.current as any
		);
		distanceToTop.current = (outerRef.current as any).scrollTop;
		set_isSticky(distanceToBottom.current < 50);
		checkShouldLoad();
	}

	/* ------------------ load if reaching end or start of page ----------------- */
	function checkShouldLoad() {
		if (loadingFlag.current) return;
		if (!isAtTop && distanceToTop.current < WRAPPER_HEIGHT) {
			loadItems(1);
		} else if (!isAtBottom && distanceToBottom.current < WRAPPER_HEIGHT) {
			loadItems(-1);
		}
	}

	React.useEffect(() => {
		if (!outerRef.current || !innerRef.current) return;
		if (lastLoadDirection.current == 0) return;
		const keysToDelete = Object.keys(deleteMap);

		//we wait a litte for the newly created items to calculate their heigts
		//and for our scroller to update its scroll position based on the new items
		setTimeout(() => {
			if (keysToDelete.length > 0) {
				set_deleteMap({});
				set_itemsMap((oldmap) => {
					const newItemsMap = { ...oldmap };
					keysToDelete.forEach((d) => {
						delete newItemsMap[d];
					});

					return newItemsMap;
				});
				return;
			}
		}, 400);
	}, [deleteMap]);
	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!outerRef.current || !innerRef.current) return;
		if (lastLoadDirection.current == 0) return;

		const isNewItemAdded = newItemEntries.length > lastNewItemCount.current;
		const itemDelta = itemEntries.length - lastItemCount.current;

		lastNewItemCount.current = newItemEntries.length;
		lastItemCount.current = itemEntries.length;

		if (itemDelta != 0) {
			const shouldStickToBottom = (lastLoadDirection.current == 1) == itemDelta > 0;

			//when adding items to bottom of the list and we try to remove items from above the list
			//there is no need to update scroll positions
			if (lastLoadDirection.current == -1 && itemDelta < 0) return;
			if (shouldStickToBottom) {
				stickToBottom();
			} else {
				stickToTop();
			}
		} else if (isNewItemAdded && isSticky) {
			stickToBottom();
		}
	}, [newItemEntries, itemEntries]);

	function stickToBottom() {
		/* ---------------------- keep same distance to bottom ---------------------- */
		const jumpDistance =
			currentDistanceToBottom(innerRef.current as any, outerRef.current as any) -
			distanceToBottom.current;
		const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
		(outerRef.current as any).scrollTop = newScrollPosition;
	}
	function stickToTop() {
		/* ------------------------ keep same distance to top ----------------------- */
		(outerRef.current as any).scrollTop = distanceToTop.current;
	}

	/* -------------------------------------------------------------------------- */
	/*                             render the scroller                            */
	/* -------------------------------------------------------------------------- */

	return (
		<div
			ref={outerRef}
			className="azchat-filler azchat-virtualContainer"
			style={
				{
					'--WRAPPER_HEIGHT': WRAPPER_HEIGHT,
				} as any
			}
			onScroll={_onScroll}
		>
			<div ref={innerRef}>
				{isAtTop && props.TopContent && <props.TopContent />}
				<div className={'azchat-wrapper' + (isAtTop ? ' gone' : '')}>
					{props.WrapperContent && <props.WrapperContent />}
				</div>

				<ol>
					{itemEntries.map((r, index) =>
						RowRender({ ...props, key: r[0], item: r[1], index: index })
					)}
					{newItemEntries.map((r, index) =>
						RowRender({ ...props, key: 'n' + r[0], item: r[1], index: index })
					)}
				</ol>

				<div className={'azchat-wrapper' + (isAtBottom ? ' gone' : '')}>
					{props.WrapperContent && <props.WrapperContent />}
				</div>
				<div ref={bottomElementRef}>
					{isAtBottom && props.BottomContent && <props.BottomContent />}
				</div>
			</div>
		</div>
	);
}

type RowRenderProps = VirtualScrollerProps & { key: any; item: any; index: number };
function RowRender(props: RowRenderProps) {
	let content: any = null;
	if (props.ItemRender) content = <props.ItemRender item={props.item} />;
	else content = 'item';

	return (
		<li key={props.key} className={'azchat-item'}>
			{content}
		</li>
	);
}
export default VirtualScroller;
