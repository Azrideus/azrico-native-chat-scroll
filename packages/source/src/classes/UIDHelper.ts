export class UIDHelper {
	static currentid = 0;
	static nextid() {
		return UIDHelper.currentid++;
	}
}
