import { inject, Injectable } from '@angular/core';
import { SnackService } from '../../core/snack/snack.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { T } from '../../t.const';

/** Rejected sync cycles in a row before the streak is surfaced. */
export const REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE = 3;

/**
 * A cycle ending in `UploadRevToMatchMismatchAPIError` (the adapter already
 * re-downloaded and retried inside it) usually means another device uploaded
 * first; the next cycle resolves that silently. When it repeats cycle after
 * cycle, the server is refusing this device's writes — e.g. a proxy rewriting
 * ETags (#10808) — and local changes never leave the device. Say so once per
 * streak and keep the sync icon on error; retries continue unchanged.
 */
@Injectable({ providedIn: 'root' })
export class SyncUploadRejectionNoticeService {
  private _providerManager = inject(SyncProviderManager);
  private _snackService = inject(SnackService);
  private _rejectedCycles = 0;
  private _hasShownNotice = false;

  onUploadRejected(): void {
    this._rejectedCycles++;
    if (this._rejectedCycles < REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE) {
      this._providerManager.setSyncStatus('UNKNOWN_OR_CHANGED');
      return;
    }
    this._providerManager.setSyncStatus('ERROR');
    if (!this._hasShownNotice && !this._snackService.hasPendingPersistentAction()) {
      this._hasShownNotice = true;
      this._snackService.open({
        msg: T.F.SYNC.S.UPLOAD_REJECTED_REPEATEDLY,
        type: 'ERROR',
        config: { duration: 12000 },
      });
    }
  }

  /** A completed sync ends the streak. */
  reset(): void {
    this._rejectedCycles = 0;
    this._hasShownNotice = false;
  }
}
