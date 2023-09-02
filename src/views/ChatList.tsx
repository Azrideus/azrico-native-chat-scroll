import React from 'react';
import { VariableSizeList as List, ListOnScrollProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';

/* -------------------------------------------------------------------------- */

type ChatListProps = {
	loadFunction?: (props: any) => Promise<any[]>;
	batchSize?: number;

	newItems?: any[];
	HeaderItem?: React.ElementType<any>;
	ItemRender?: React.ElementType<any>;
};

const BUFFER_SIZE = 5;

export function ChatList(props: ChatListProps) {
	const loaderRef = React.useRef<any>();
	const outerRef = React.useRef<any>();
	const innerRef = React.useRef<any>();
	const sizeCache = React.useRef<any>({});
	const lastScroll = React.useRef<any>({});
	const pendingItems = React.useRef<number>(0);

	const [loading, set_loading] = React.useState(false);
	const [shouldStick, set_shouldStick] = React.useState(false);
	const [currentItems, set_currentItems] = React.useState<any[]>([]);

	function getListRef() {
		return loaderRef.current?._listRef;
	}

	const loadBatchSize = React.useMemo(() => {
		return Math.max(BUFFER_SIZE, props.batchSize || 0);
	}, [props.batchSize, BUFFER_SIZE]);

	const itemCount = React.useMemo(() => {
		return (
			Number(currentItems.length) + Number(props.newItems?.length || 0) + BUFFER_SIZE
		);
	}, [currentItems, props.newItems, BUFFER_SIZE]);

	/* --------------------------------- checks --------------------------------- */
	const getItemSize = (index) => {
		if (index < BUFFER_SIZE) return 40;
		return sizeCache.current[index] || 40;
	};

	const isItemLoaded = React.useCallback((index) => index > BUFFER_SIZE, [BUFFER_SIZE]);
	const loadMoreItems = React.useCallback(
		async (startIndex, stopIndex) => {
			//when we are loading items try to keep the same distance from bottom
			const scrollBottomBeforeLoad = lastScroll.current.scrollOffset;
			if (typeof props.loadFunction !== 'function' || loading) {
				pushBackFromTop(scrollBottomBeforeLoad);
				return;
			}

			const skip = pendingItems.current + currentItems.length;
			const limit = loadBatchSize;
			try {
				pendingItems.current += limit;
				set_loading(true);
				const res = await props.loadFunction({ skip: skip, limit: limit });
				set_currentItems((s) => [...res, ...s]);
			} finally {
				getListRef().resetAfterIndex(0);
				pushBackFromTop(scrollBottomBeforeLoad);
				set_loading(false);
				pendingItems.current -= limit;
			}
		},
		[props.loadFunction, currentItems]
	);

	/* -------------------------------------------------------------------------- */
	/*                               scroll function                              */
	/* -------------------------------------------------------------------------- */
	function pushBackFromTop(v) {
		const finalScrollPos = v + 40;
		console.log(
			'pushBackFromTop',
			innerRef.current.offsetHeight,
			outerRef.current.offsetHeight
		);
		//if (innerRef.current.offsetHeight > outerRef.current.offsetHeight)
		//	scrollTo(finalScrollPos);
	}
	function scrollToItem(r) {
		getListRef().scrollToItem(r);
	}
	function scrollTo(r) {
		getListRef()?.scrollTo(r);
	}
	React.useEffect(() => {
		if (shouldStick) {
			setTimeout(() => {
				scrollToItem(itemCount);
			}, 200);
		}
	}, [itemCount, shouldStick]);

	/* -------------------------------------------------------------------------- */
	/*                                   events                                   */
	/* -------------------------------------------------------------------------- */
	function _onScroll(e: ListOnScrollProps) {
		lastScroll.current = e;
		const maxHeight = innerRef.current.offsetHeight;

		if (e.scrollOffset < 200 && maxHeight > 300) {
			/* ---------------------- prevent scrolling too high... --------------------- */
			scrollTo(200);
			// console.log('up offset', e.scrollOffset);
			// e.scrollUpdateWasRequested = true;
			// e.scrollOffset = 200;
		}

		/* ----------- check if we should stick to the bottom of the list ----------- */
		if ((e.scrollDirection == 'forward') == shouldStick) return;

		const viewHeight = outerRef.current.offsetHeight;

		const scrollHeight = e.scrollOffset + viewHeight;
		const distToBottom = maxHeight - scrollHeight;

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
					itemCount={itemCount}
				>
					{({ onItemsRendered, ref }) => (
						<List
							innerRef={innerRef}
							outerRef={outerRef}
							onScroll={_onScroll}
							itemData={{
								...props,
								currentItems: currentItems,
								isItemLoaded: isItemLoaded,
								sizeCache: sizeCache.current,
							}}
							//always start the scroll at bottom of the list

							ref={ref}
							onItemsRendered={onItemsRendered}
							height={height}
							width={width}
							itemCount={itemCount}
							estimatedItemSize={40}
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
	props.data.sizeCache[props.index] = 40;
	return (
		<div ref={ref} style={{ border: '1px solid red' }}>
			{props.children}
		</div>
	);
}
function RenderRow(props: any) {
	const data = props.data;
	let content: any = null;

	if (props.index === 0) {
		const HeaderItem = data.HeaderItem;
		content = <HeaderItem />;
	} else if (props.index > BUFFER_SIZE) {
		/* --------------------- this item is loaded. render it --------------------- */
		const ItemRender = data.ItemRender;
		if (!ItemRender) return null;

		const currentItems = data.currentItems;
		const unbufferedIndex = props.index - BUFFER_SIZE - 1;
		content = (
			<SizeCalculator {...props}>
				<ItemRender index={unbufferedIndex} item={currentItems[unbufferedIndex]} />
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
