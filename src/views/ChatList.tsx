import React from 'react';
import { VariableSizeList as List, ListOnScrollProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import SizeHelper from '../classes/SizeHelper';
import { array_sum } from '@azrico/object';
import './styles.css';

/* -------------------------------------------------------------------------- */

type ChatListProps = {
	loadFunction?: (props: any) => Promise<any[]>;
	batchSize?: number;

	newItems?: any[];
	HeaderItem?: React.ElementType<any>;
	ItemRender?: React.ElementType<any>;
};

const BUFFER_SIZE = 10;

export function ChatList(props: ChatListProps) {
	const loaderRef = React.useRef<any>();
	const outerRef = React.useRef<HTMLElement>();
	const innerRef = React.useRef<HTMLElement>();
	const endIndex = React.useRef<any>(-1);
	const lastBottomDistance = React.useRef<any>(-1);

	const sizeHelper = React.useRef<SizeHelper>(
		new SizeHelper((i) => getListRef().resetAfterIndex(i))
	);

	const lastScroll = React.useRef<any>({});
	const pendingItems = React.useRef<number>(0);
	// const avgSize = React.useRef<number>(0);

	const [sizeCacheChanged, set_sizeCacheChanged] = React.useState(0);
	const [shouldStick, set_shouldStick] = React.useState(false);

	//older messages are added to end of this list
	//so index 0 is always the newest item
	const [items, set_items] = React.useState<any[]>([]);

	function getListRef() {
		return loaderRef.current?._listRef;
	}

	//how many items should we load per batch
	const newItems = React.useMemo(() => {
		return props.newItems || [];
	}, [props.newItems]);

	//how many items should we load per batch
	const loadBatchSize = React.useMemo(() => {
		return Math.max(BUFFER_SIZE, props.batchSize || 0);
	}, [props.batchSize, BUFFER_SIZE]);

	const dbItemCount = React.useMemo(() => {
		return items.length;
	}, [items]);

	//real items. not counting buffers
	const realItemCount = React.useMemo(() => {
		return dbItemCount + newItems.length;
	}, [dbItemCount, newItems]);

	//row count of the list. including buffers
	const allItemsCount = React.useMemo(() => {
		return realItemCount + BUFFER_SIZE;
	}, [realItemCount, BUFFER_SIZE]);

	/* --------------------------------- checks --------------------------------- */

	const getItemSize = (index) => {
		if (index < BUFFER_SIZE) return SizeHelper.BUFFER_HEIGHT;
		return (
			sizeHelper.current.getSizeOf(getActualIndex(index)) || SizeHelper.BUFFER_HEIGHT
		);
	};

	//the first buffer items are not really loaded, we keep them there so the scroll jumps less often
	const isItemLoaded = React.useCallback((index) => index > BUFFER_SIZE, [BUFFER_SIZE]);

	/* -------------------------------------------------------------------------- */
	/*                               load more items                              */
	/* -------------------------------------------------------------------------- */
	const loadMoreItems = React.useCallback(
		async (startIndex, stopIndex) => {
			if (typeof props.loadFunction !== 'function') {
				return;
			}

			//start the load from the first unloaded item
			//also make sure to not load pendingItems again !
			//some items are for buffering. dont add them to total loaded items
			const skip = pendingItems.current + realItemCount;

			const limit = Math.max(stopIndex - startIndex + 1, loadBatchSize);

			//we have reached the end of our items.
			//dont load anything else
			if (endIndex.current > 0 && endIndex.current < skip + limit) {
				console.log('out of bounds. dont load', skip, limit);
				return;
			}

			try {
				//we do this to make sure we dont load these items twice
				pendingItems.current += limit;

				//results should be sorted in `newest first`
				const res = await props.loadFunction({ skip: skip, limit: limit });
				if (res.length < limit) {
					//loaded less items than the limit.
					//this means we reached the end of our list
					endIndex.current = skip + res.length;
				}

				set_items((old_items) => {
					const resultMap = [...old_items, ...res];
					return resultMap;
				});
			} finally {
				// getListRef().resetAfterIndex(0);

				//loading is done
				//set_loading(false);

				//no longer pending
				pendingItems.current -= limit;
			}
		},
		[props.loadFunction, items]
	);

	/* ----------------------------------- get ---------------------------------- */
	const getActualIndex = React.useCallback(
		(index) => {
			return BUFFER_SIZE + dbItemCount - index - 1;
		},
		[dbItemCount]
	);
	const getItem = React.useCallback(
		(index) => {
			if (index < BUFFER_SIZE) return null; //buffer item
			const actualIndex = getActualIndex(index);
			if (actualIndex < 0) {
				//new items (they start at 0 so we add +1)
				return newItems[Math.abs(actualIndex + 1)];
			} else {
				//existing items
				return items[actualIndex];
			}
		},
		[newItems, items]
	);

	/* -------------------------------------------------------------------------- */
	/*                               scroll function                              */
	/* -------------------------------------------------------------------------- */

	function scrollToItem(r) {
		getListRef().scrollToItem(r);
	}
	function scrollTo(r) {
		getListRef()?.scrollTo(r);
	}

	/* -------------------------------------------------------------------------- */
	/*                                    init                                    */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!loaderRef.current || !innerRef.current) return;
		innerRef.current.className = 'azchat-innerlist';
	}, [loaderRef.current, innerRef.current]);

	/* -------------------------------------------------------------------------- */
	/*                keep the same distance to bottom of the list                */
	/* -------------------------------------------------------------------------- */
	React.useEffect(() => {
		keepBottomDistance();
	}, [items, sizeCacheChanged]);

	function keepBottomDistance(forceDist = null, retry = 10) {
		if (shouldStick) {
			stickToBottom();
			return;
		}
		if (!innerRef.current || !lastScroll.current) return;

		const bottomDistThen = forceDist || lastBottomDistance.current;

		//current distance to bottom of screen
		const bottomDistNow = currentDistanceToBottom();

		if (bottomDistNow === bottomDistThen) return;

		//the scroll jumped by this much because of the layout shift
		const jumpDistance = bottomDistNow - bottomDistThen;

		//add the difference to scroll bar position so we get back to the last position
		const newScrollpos = lastScroll.current.scrollOffset + jumpDistance;

		console.log('jump:', jumpDistance);
		console.log('bottomDistThen:', bottomDistThen);
		console.log('bottomDistNow:', bottomDistNow);
		stickToBottom();
		//scrollTo(newScrollpos);

		setTimeout(() => {
			console.log('DB AFTER:', currentDistanceToBottom());
		}, 500);
	}

	function currentDistanceToBottom() {
		if (!innerRef.current || !outerRef.current) return 0;
		return innerRef.current.offsetHeight - lastScroll.current.scrollOffset;
	}

	/* -------------------------------------------------------------------------- */
	/*                         stick to bottom of the list                        */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (shouldStick) {
			//scroll to the last item
			stickToBottom();
		}
	}, [allItemsCount, shouldStick, sizeCacheChanged]);
	function stickToBottom(retry = 10) {
		if (!outerRef.current) return;

		const scTarget = outerRef.current?.scrollHeight + 5000;
		scrollTo(scTarget);
	}

	/* -------------------------------------------------------------------------- */
	/*                                   events                                   */
	/* -------------------------------------------------------------------------- */
	function _onScroll(e: ListOnScrollProps) {
		if (!innerRef.current || !outerRef.current) return;
		if (!e.scrollUpdateWasRequested) return;
		lastScroll.current = e;

		/* ----------- check if we should stick to the bottom of the list ----------- */
		lastBottomDistance.current = currentDistanceToBottom();
		const distToBottom = lastBottomDistance.current - outerRef.current.offsetHeight;
		// console.log('bd:', lastBottomDistance.current);

		if ((e.scrollDirection == 'forward') == shouldStick) return;
		//if we are very close to the end of the scroll list
		//then stick to the end even if we get new items added to the list
		if (shouldStick) {
			if (distToBottom > 20) {
				set_shouldStick(false);
				console.log('disable sticky');
			}
		} else {
			if (distToBottom < 20) {
				set_shouldStick(true);
				console.log('enable sticky');
			}
		}
	}

	return (
		<>
			<AutoSizer>
				{({ height, width }) => (
					<InfiniteLoader
						ref={loaderRef}
						isItemLoaded={isItemLoaded}
						threshold={5}
						minimumBatchSize={loadBatchSize}
						loadMoreItems={loadMoreItems}
						itemCount={allItemsCount}
					>
						{({ onItemsRendered, ref }) => (
							<List
								innerRef={innerRef}
								outerRef={outerRef}
								onScroll={_onScroll}
								itemData={{
									...props,
									getItem: getItem,
									getActualIndex: getActualIndex,
									isItemLoaded: isItemLoaded,
									endIndex: endIndex.current,
									sizeHelper: sizeHelper.current,
								}}
								//always start the scroll at bottom of the list

								ref={ref}
								onItemsRendered={onItemsRendered}
								height={height}
								width={width}
								itemCount={allItemsCount}
								estimatedItemSize={80}
								itemSize={getItemSize}
							>
								{RenderRow}
							</List>
						)}
					</InfiniteLoader>
				)}
			</AutoSizer>
		</>
	);
}

function RenderRow(props: any) {
	const data = props.data;
	let content: any = null;
	const sh = data.sizeHelper as SizeHelper;

	const ItemRender = data.ItemRender;
	const actualIndex = data.getActualIndex(props.index);
	const itemToRender = data.getItem(props.index);

	const rowRef = React.useRef<any>();

	React.useEffect(() => {
		sh.setSizeOf(props.index, actualIndex, rowRef.current.getBoundingClientRect().height);
	}, [sh, actualIndex, data.windowWidth]);

	if (props.index === 0) {
		if (data.endIndex && data.endIndex > 0) {
			const HeaderItem = data.HeaderItem;
			content = <HeaderItem />;
		} else {
			content = null;
		}
	} else if (props.index > BUFFER_SIZE) {
		/* --------------------- this item is loaded. render it --------------------- */
		if (!ItemRender) return null;
		content = <ItemRender index={props.index} item={itemToRender} />;
	}
	return (
		<div key={props.index} style={props.style} x-data-actualIndex={actualIndex}>
			<div ref={rowRef}>{content}</div>
		</div>
	);
}

export default ChatList;
