import { ItemProps, ListProps } from '@azrico/react-virtuoso';
import React, { Context, DOMAttributes } from 'react';
import { fn_eval, useForceUpdate } from '../classes/HelperFunctions';
import { Modify } from '@azrico/types';
import { ChatItem } from '../classes/ChatItem';
export type ForwardedEvents = Partial<{
	onDoubleClick: (ref, data) => any;
	onClick: (ref, data) => any;
}>;
export type ForwardedProps = Partial<
	{
		customProps: DOMAttributes<any>;
		component: any;
		className: string;
	} & ForwardedEvents
>;
type ForwardedItemProps = Modify<
	ItemProps<any>,
	{ item: ChatItem<any>; context?: Context<unknown> }
>;

export const Table = (customprops: ForwardedProps) =>
	React.forwardRef<any, ListProps & { context?: Context<unknown> }>((props, ref) => {
		const finalprops = {
			...props,
			className: customprops.className,
			// style: { ...props.style, listStyleType: 'none' },
			ref: ref,
		};
		return React.createElement(
			customprops.component ?? 'table',
			finalprops,
			props.children
		);
	});
export const VirtualItem = (customprops: ForwardedProps) =>
	React.forwardRef<HTMLLIElement, ForwardedItemProps>((props, ref) => {
		const { item, ...restprops } = props;
		const [updateKey, forceUpdate] = useForceUpdate();
		item.itemref = ref as any;
		item.refreshFunction = forceUpdate;
		return React.createElement(
			customprops.component ?? 'tr',
			{
				...restprops,
				...customprops.customProps,
				onDoubleClick: () => fn_eval(customprops.onDoubleClick, ref, item.data),
				onClick: () => fn_eval(customprops.onClick, ref, item.data),
				key: updateKey,
				id: 'msg-' + item._id,
				ref: ref,
			},
			props.children
		);
	});
export default VirtualItem;
