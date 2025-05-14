import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { Observable, from } from 'rxjs';

import { ApiConfiguration } from 'api-atlas/api-configuration';

import {
  QcAtlasUiRepositoryConfigurationService,
  UiFeatures
} from '../../directives/qc-atlas-ui-repository-configuration.service';
import { UtilService } from '../../util/util.service';
import { PlanqkPlatformLoginService } from '../../services/planqk-platform-login.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  UiFeatures = UiFeatures;

  title = 'qc-atlas-ui';
  hideNav = false;
  bearerTokenSet = false;

  constructor(
    private http: HttpClient,
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    public configData: QcAtlasUiRepositoryConfigurationService,
    private config: ApiConfiguration,
    private utilService: UtilService,
    private planqkPlatformLoginService: PlanqkPlatformLoginService
  ) { }

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Small, Breakpoints.XSmall])
      .subscribe((state: BreakpointState) => {
        this.hideNav = state.matches;
      });

    this.planqkPlatformLoginService.isLoggedIn().subscribe((loggedIn: boolean) => {
      if (loggedIn) {
        this.bearerTokenSet = true;
        this.config.rootUrl = 'https://platform.planqk.de/qc-catalog';
        this.utilService.callSnackBar('Successfully logged into the PlanQK platform.');
      } else {
        this.utilService.callSnackBar('Not logged into the PlanQK platform.');
      }
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  onSettings(): void { }

  login(): void {
    if (!this.bearerTokenSet) {
      this.planqkPlatformLoginService.loginToPlanqkPlatform();
    } else {
      this.bearerTokenSet = false;
      this.config.rootUrl = 'http://localhost:6626/atlas';
      this.reloadStartPage().subscribe(() => {
        this.planqkPlatformLoginService.logoutFromPlanqkPlatform();
        this.utilService.callSnackBar('Successfully logged out of the PlanQK platform.');
      });
    }
  }

  reloadStartPage(): Observable<boolean> {
    return from(
      this.router
        .navigateByUrl(location.origin, { skipLocationChange: true })
        .then(() => this.router.navigate(['/algorithms']))
    );
  }

  fetchQCPatterns(): void {
    this.http
      .get<any>(
        'http://localhost:1977/patternatlas/patternLanguages/af7780d5-1f97-4536-8da7-4194b093ab1d/patterns'
      )
      .subscribe({
        next: (patterns) => {
          console.log(patterns);
        },
        error: (error) => {
          console.error('There was an error!', error);
        }
      });
  }
}
