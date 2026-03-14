describe('Smoke Test', () => {
    it('should load the home page', () => {
        cy.visit('/');
        cy.contains('Versa').should('be.visible');
    });

    it.skip('should verify accessibility on home page', () => {
        cy.visit('/');
        cy.injectAxe();
        // Exclude hero section — axe cannot compute contrast through image + gradient stacking contexts
        cy.checkA11y({ exclude: ['[data-testid="hero"]'] }, {
            includedImpacts: ['critical', 'serious']
        }, (violations) => {
            cy.task('log', violations);
        });
    });


});
