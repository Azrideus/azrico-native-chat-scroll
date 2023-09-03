import React from 'react';
import { VariableSizeList as List, ListOnScrollProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import SizeHelper from '../classes/SizeHelper';
import { array_sum } from '@azrico/object';

/* -------------------------------------------------------------------------- */

type ChatListProps = {
	loadFunction?: (props: any) => Promise<any[]>;
	batchSize?: number;

	newItems?: any[];
	HeaderItem?: React.ElementType<any>;
	ItemRender?: React.ElementType<any>;
};

const BUFFER_SIZE = 5;
const DEFAULT_HEIGHT = 40;

export function ChatList(props: ChatListProps) {
	const loaderRef = React.useRef<any>();
	const outerRef = React.useRef<any>();
	const innerRef = React.useRef<any>();
	const endIndex = React.useRef<any>(-1);
	const lastBottomDistance = React.useRef<any>(-1);
	const sizeHelper = React.useRef<SizeHelper>(new SizeHelper());
	const lastScroll = React.useRef<any>({});
	const pendingItems = React.useRef<number>(0);
	const avgSize = React.useRef<number>(0);

	const [sizeCacheChanged, set_sizeCacheChanged] = React.useState(false);
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
		if (index < BUFFER_SIZE) return avgSize.current;
		return sizeHelper.current.getSizeOf(index) || avgSize.current;
	};

	//the first buffer items are not really loaded, we keep them there so the scroll jumps less often
	const isItemLoaded = React.useCallback((index) => index > BUFFER_SIZE, [BUFFER_SIZE]);

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

				//distance to bottom of the list before we added the new items
				// console.log(
				// 	'save scroll pos :',
				// 	innerRef.current.offsetHeight - lastScroll.current.scrollOffset
				// );
				// lastBottomDistance.current =
				// 	innerRef.current.offsetHeight - lastScroll.current.scrollOffset;

				//add the loaded items from db to our list
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

	/* -------------------------- set sizehelper's data ------------------------- */
	React.useEffect(() => {
		if (loaderRef.current) {
			sizeHelper.current.setReloadFunction((index) => {
				set_sizeCacheChanged((s) => !s);

				const sizeList = Object.values(sizeHelper.current._cache);
				avgSize.current = array_sum(sizeList) / sizeList.length;
				getListRef().resetAfterIndex(index);
			});
		}
	}, [loaderRef.current]);
	/* -------------------------------------------------------------------------- */
	/*                keep the same distance to bottom of the list                */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!innerRef.current || !lastScroll.current || shouldStick) return;

		//current distance to bottom of screen
		const bottomDistNow = currentDistanceToBottom();

		if (bottomDistNow === lastBottomDistance.current) return;

		//the scroll jumped by this much because of the layout shift
		const jumpDistance = Math.abs(lastBottomDistance.current - bottomDistNow);

		//add the difference to scroll bar position so we get back to the last position
		const newScrollpos = lastScroll.current.scrollOffset + jumpDistance;

		//NEWPOS + NEW BOTTOM = TOTAL H
		//NEW POS = TOTAL HEIGHT - BOTTOM

		console.log('bottomDistThen', lastBottomDistance.current);
		console.log('bottomDistNow', bottomDistNow);
		console.log('jumpDistance', jumpDistance);

		console.log('OldScrollPos', lastScroll.current.scrollOffset);
		console.log('newScrollpos', newScrollpos);
		//go to the last position
		scrollTo(newScrollpos);
	}, [items, sizeCacheChanged]);

	function currentDistanceToBottom() {
		return innerRef.current.offsetHeight - lastScroll.current.scrollOffset;
	}

	// /* -------------------------------------------------------------------------- */
	// /*                                refresh sizes                               */
	// /* -------------------------------------------------------------------------- */
	// React.useLayoutEffect(() => {
	// 	//sizeHelper.current.reloadGrid();
	// }, [itemCount]);

	/* -------------------------------------------------------------------------- */
	/*                         stick to bottom of the list                        */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (shouldStick) {
			//setTimeout(() => {
			//scroll to the last item
			scrollToItem(allItemsCount);
			//}, 200);
		}
	}, [allItemsCount, shouldStick, sizeCacheChanged]);

	/* -------------------------------------------------------------------------- */
	/*                                   events                                   */
	/* -------------------------------------------------------------------------- */
	function _onScroll(e: ListOnScrollProps) {
		lastScroll.current = e;
		const maxHeight = innerRef.current.offsetHeight;

		//if (e.scrollOffset < 200 && maxHeight > 300 && endIndex.current == -1) {
		//	/* ---------------------- prevent scrolling too high... --------------------- */
		//	 scrollTo(400);
		//	 console.log('scroll back');
		//}

		/* ----------- check if we should stick to the bottom of the list ----------- */

		const viewHeight = outerRef.current.offsetHeight;

		const scrollHeight = e.scrollOffset + viewHeight;
		const distToBottom = maxHeight - scrollHeight;

		lastBottomDistance.current = currentDistanceToBottom();

		if ((e.scrollDirection == 'forward') == shouldStick) return;
		//if we are very close to the end of the scroll list
		//then stick to the end even if we get new items added to the list
		if (shouldStick) {
			if (distToBottom > 20) {
				set_shouldStick(false);
			}
		} else {
			if (distToBottom < 20) {
				set_shouldStick(true);
			}
		}
	}

	return (
		<AutoSizer>
			{({ height, width }) => (
				<InfiniteLoader
					ref={loaderRef}
					isItemLoaded={isItemLoaded}
					threshold={1}
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
							estimatedItemSize={DEFAULT_HEIGHT}
							itemSize={getItemSize}
						>
							{RenderRow}
						</List>
					)}
				</InfiniteLoader>
			)}
		</AutoSizer>
	);
}
function SizeCalculator(props) {
	const ref = React.useRef<any>();
	const sh = props.data.sizeHelper as SizeHelper;
	React.useEffect(() => {
		sh.setSizeOf(props.index, ref.current.offsetHeight);
	}, []);
	return (
		<div ref={ref} style={{ height: 'max-content' }} x-data-h={sh.getSizeOf(props.index)}>
			{props.children}
		</div>
	);
}
function RenderRow(props: any) {
	const data = props.data;
	let content: any = null;
	if (props.index === 0) {
		if (data.endIndex && data.endIndex > 0) {
			const HeaderItem = data.HeaderItem;
			content = <HeaderItem />;
		} else {
			content = null;
		}
	} else if (props.index > BUFFER_SIZE) {
		/* --------------------- this item is loaded. render it --------------------- */
		const ItemRender = data.ItemRender;
		if (!ItemRender) return null;

		const getItem = data.getItem;
		content = (
			<SizeCalculator {...props}>
				<ItemRender index={props.index} item={getItem(props.index)} />
			</SizeCalculator>
		);
	}
	return (
		<div key={props.index} style={props.style} x-data-rawindex={props.index}>
			{content}
		</div>
	);
}

export default ChatList;
