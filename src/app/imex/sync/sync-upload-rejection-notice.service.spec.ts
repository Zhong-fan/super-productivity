import { TestBed } from '@angular/core/testing';
import { SnackService } from '../../core/snack/snack.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { T } from '../../t.const';
import {
  REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE,
  SyncUploadRejectionNoticeService,
} from './sync-upload-rejection-notice.service';

describe('SyncUploadRejectionNoticeService', () => {
  let service: SyncUploadRejectionNoticeService;
  let snackService: jasmine.SpyObj<SnackService>;
  let providerManager: jasmine.SpyObj<SyncProviderManager>;

  const rejectCycles = (n: number): void => {
    for (let i = 0; i < n; i++) {
      service.onUploadRejected();
    }
  };

  beforeEach(() => {
    snackService = jasmine.createSpyObj('SnackService', [
      'open',
      'hasPendingPersistentAction',
    ]);
    snackService.hasPendingPersistentAction.and.returnValue(false);
    providerManager = jasmine.createSpyObj('SyncProviderManager', ['setSyncStatus']);
    TestBed.configureTestingModule({
      providers: [
        { provide: SnackService, useValue: snackService },
        { provide: SyncProviderManager, useValue: providerManager },
      ],
    });
    service = TestBed.inject(SyncUploadRejectionNoticeService);
  });

  it('stays silent while a rejection can still be a one-off concurrent upload', () => {
    rejectCycles(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE - 1);

    expect(snackService.open).not.toHaveBeenCalled();
    expect(providerManager.setSyncStatus.calls.allArgs()).toEqual(
      Array(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE - 1).fill(['UNKNOWN_OR_CHANGED']),
    );
  });

  it('surfaces a streak once and keeps the sync status on error', () => {
    rejectCycles(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE + 2);

    expect(snackService.open).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        msg: T.F.SYNC.S.UPLOAD_REJECTED_REPEATEDLY,
        type: 'ERROR',
      }),
    );
    expect(providerManager.setSyncStatus).toHaveBeenCalledWith('ERROR');
    expect(providerManager.setSyncStatus.calls.mostRecent().args).toEqual(['ERROR']);
  });

  it('waits for a pending persistent snack instead of skipping the notice', () => {
    snackService.hasPendingPersistentAction.and.returnValue(true);
    rejectCycles(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE);
    expect(snackService.open).not.toHaveBeenCalled();

    snackService.hasPendingPersistentAction.and.returnValue(false);
    service.onUploadRejected();
    expect(snackService.open).toHaveBeenCalledTimes(1);
  });

  it('starts a new streak after a completed sync', () => {
    rejectCycles(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE);
    service.reset();
    rejectCycles(REJECTED_UPLOAD_CYCLES_BEFORE_NOTICE - 1);

    expect(snackService.open).toHaveBeenCalledTimes(1);
    expect(providerManager.setSyncStatus.calls.mostRecent().args).toEqual([
      'UNKNOWN_OR_CHANGED',
    ]);

    service.onUploadRejected();
    expect(snackService.open).toHaveBeenCalledTimes(2);
  });
});
