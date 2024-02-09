import { useEffect, useState } from 'react';
import ChatManager, { ChangeOperation } from '../classes/ChatManager';
import { currentDistanceToBottom } from '../classes/HelperFunctions';
import React from 'react';

type ChatScrollProps = {
	outerRef: React.RefObject<HTMLDivElement>;
	innerRef: React.RefObject<HTMLDivElement>;
	bottomRef: React.RefObject<HTMLDivElement>;
	checkShouldLoad: () => void;
	chatManager: ChatManager;
	currentItems: any[];
};

export const useChatScroll = ({
	outerRef,
	innerRef,
	bottomRef,
	checkShouldLoad,
	chatManager,
	currentItems,
}: ChatScrollProps) => {
	const firtLoad = React.useRef<boolean>(true);

	function _onScroll(e: any) {
		/* ---------------------------- update distances ---------------------------- */
		chatManager.distanceToBottom = currentDistanceToBottom(
			innerRef.current as any,
			outerRef.current as any
		);
		chatManager.distanceToTop = (outerRef.current as any).scrollTop;
		chatManager.isSticky = chatManager.distanceToBottom < 100;

		/* -------------------------- check if should load -------------------------- */
		checkShouldLoad();
	}

	useEffect(() => {
		outerRef.current?.addEventListener('scroll', _onScroll);
		return () => {
			outerRef.current?.removeEventListener('scroll', _onScroll);
		};
	}, [ outerRef]);

	/* -------------------------------------------------------------------------- */
	/*            prevent the scroller from jumping when you add items            */
	/* -------------------------------------------------------------------------- */
	React.useLayoutEffect(() => {
		if (!outerRef.current || !innerRef.current) return;

		const itemDelta = chatManager.lastCountChange;
		const lastOp = chatManager.lastOperation;
		if (lastOp === ChangeOperation.NONE) return;

		if (chatManager.lastDBLoad > 0 && firtLoad.current) {
			firtLoad.current = false;
			return stickToBottom(false);
		}
		if (Number.isNaN(chatManager.referenceLastTop)) {
			//fist load, stick to bottom
			return stickToBottom();
		}
		if (chatManager.isSticky && Math.abs(itemDelta) < 5) {
			//sticky to bottom
			return stickToBottom();
		}

		{
			//keep the same distance to the reference message
			const jumpDistance = chatManager.referenceTop - chatManager.referenceLastTop;
			const newScrollPosition = (outerRef.current as any).scrollTop + jumpDistance;
			(outerRef.current as any).scrollTop = newScrollPosition;
			// console.log('jumpDistance:', jumpDistance);
		}
	}, [currentItems]);

	function stickToBottom(smooth = true) {
		setTimeout(() => {
			bottomRef.current?.scrollIntoView({
				behavior: smooth ? 'smooth' : undefined,
			});
		}, 100);
	}
};
