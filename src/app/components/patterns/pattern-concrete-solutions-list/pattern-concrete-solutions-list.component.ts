import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ConcreteSolutionDto } from 'generated/api-atlas/models/concrete-solution-dto';
import { ConcreteSolutionService } from 'generated/api-atlas/services/concrete-solution.service';
import { UtilService } from '../../../util/util.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../generics/dialogs/confirm-dialog.component';
import { PaginatorConfig } from '../../../util/paginatorConfig';
import { PagingInfo } from '../../../util/PagingInfo';
import {
  QueryParams,
  SelectParams,
} from '../../generics/data-list/data-list.component';
import { CreateConcreteSolutionDialogComponent } from '../dialogs/create-concrete-solution-dialog.component';

@Component({
  selector: 'app-pattern-concrete-solutions-list',
  templateUrl: './pattern-concrete-solutions-list.component.html',
  styleUrls: ['./pattern-concrete-solutions-list.component.scss'],
})
export class PatternConcreteSolutionListComponent implements OnInit {
  @Input() patternConcreteSolutions: ConcreteSolutionDto[];
  tableColumns = [
    'ID',
    'Qubit Count',
    'Header',
    'Measurement',
    'Start Pattern',
    'End Pattern',
  ];
  variableNames = [
    'id',
    'qubitCount',
    'hasHeader',
    'hasMeasurment',
    'startPattern',
    'endPattern',
  ];
  pagingInfo: PagingInfo<ConcreteSolutionDto> = {};
  paginatorConfig: PaginatorConfig = {
    amountChoices: [10, 25, 50],
    selectedAmount: 10,
  };
  loading = true;

  constructor(
    private concreteSolutionService: ConcreteSolutionService,
    private router: Router,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {}

  getPatternConcreteSolutions(params: QueryParams): void {
    this.concreteSolutionService.getPatternConcreteSolutions(params).subscribe(
      (data) => {
        this.preparePatternConcreteSolutionsData(data);
      },
      () => {
        this.utilService.callSnackBar(
          'Error! Concrete Solutions could not be retrieved.'
        );
      }
    );
  }

  preparePatternConcreteSolutionsData(data): void {
    // Read all incoming data
    if (data.content) {
      this.patternConcreteSolutions = data.content;
    } else {
      // If no content, set to empty array
      this.patternConcreteSolutions = [];
    }

    this.pagingInfo.totalPages = data.totalPages;
    this.pagingInfo.number = data.number;
    this.pagingInfo.sort = data.sort;
  }

  /**
   * Extracts a segment from a given URL.
   *
   * @param url The URL from which to extract the segment.
   * @param index The index of the segment to extract. If negative, it counts from the end.
   * @returns The extracted segment, or an empty string if the index is out of bounds.
   */
  extractSegmentFromUrl(url: string, index: number): string {
    const segments = url.split('/');

    // Adjust index for negative values
    if (index < 0) {
      index = segments.length + index;
    }

    // Return the segment if index is within bounds
    return index >= 0 && index < segments.length ? segments[index] : '';
  }

  onElementClicked(concreteSolution: ConcreteSolutionDto): void {
    this.router.navigate([
      'patterns',
      this.extractSegmentFromUrl(window.location.href, -1),
      'concrete-solutions',
      concreteSolution.id,
    ]);
  }

  onAddConcreteSolution(): void {
    this.utilService
      .createDialog(CreateConcreteSolutionDialogComponent, {
        title: 'Add new concrete solution for this pattern',
      })
      .afterClosed()
      .subscribe((dialogResult) => {
        if (dialogResult) {
          this.concreteSolutionService
            .createConcreteSolution({
              patternId: window.location.href.split('/')[length - 1],
              body: {
                id: null,
                name: dialogResult.name,
                description: dialogResult.description,
                qubitCount: dialogResult.qubitCount,
                inputParameterFormat: dialogResult.inputParameterFormat,
                hasHeader: dialogResult.hasHeader,
                hasMeasurment: dialogResult.hasMeasurement,
                startPattern: dialogResult.startPattern,
                endPattern: dialogResult.endPattern,
                concreteSolutionType: 'FILE',
              },
            })
            .subscribe(
              (data) => {
                this.router.navigate([
                  'patterns',
                  this.extractSegmentFromUrl(window.location.href, -1),
                  'concrete-solutions',
                  data.id,
                ]);
                this.utilService.callSnackBar(
                  'Concrete Solution was successfully created.'
                );
              },
              () => {
                this.utilService.callSnackBar(
                  'Error! Concrete Solution could not be created.'
                );
              }
            );
        }
      });
  }

  onDeleteElements(event: SelectParams): void {
    this.utilService
      .createDialog(ConfirmDialogComponent, {
        title: 'Confirm Deletion',
        message:
          'Are you sure you want to delete the following concrete solution(s): ',
        data: event.elements,
        variableName: 'id',
        yesButtonText: 'yes',
        noButtonText: 'no',
      })
      .afterClosed()
      .subscribe((dialogResult) => {
        if (dialogResult) {
          const deletionTasks = [];
          const snackbarMessages = [];
          let successfulDeletions = 0;
          for (const concreteSolution of event.elements) {
            deletionTasks.push(
              this.concreteSolutionService
                .deleteConcreteSolution({
                  concreteSolutionId: concreteSolution.id,
                })
                .toPromise()
                .then(() => {
                  successfulDeletions++;
                  snackbarMessages.push(
                    'Successfully deleted concrete solution "' +
                      concreteSolution.id +
                      '".'
                  );
                })
                .catch(() => {
                  snackbarMessages.push(
                    'Could not delete concrete solution "' +
                      concreteSolution.id +
                      '".'
                  );
                })
            );
          }
          forkJoin(deletionTasks).subscribe(() => {
            if (
              this.utilService.isLastPageEmptyAfterDeletion(
                successfulDeletions,
                this.patternConcreteSolutions.length,
                this.pagingInfo
              )
            ) {
              event.queryParams.page--;
            }
            this.getPatternConcreteSolutions(event.queryParams);
            snackbarMessages.push(
              this.utilService.generateFinishingSnackbarMessage(
                successfulDeletions,
                event.elements.length,
                'concrete'
              )
            );
            this.utilService.callSnackBarSequence(snackbarMessages);
          });
        }
      });
  }
}
